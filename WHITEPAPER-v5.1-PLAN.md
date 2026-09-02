# Whitepaper v5.1 — the whole package

**Date:** 2 September 2026 · **Status:** proposal, for John to cut down
**Companion:** `ROADMAP.md` (the engine phases), `KEYFRAMES.md`, `MVP.md`

This is a sidestep from engine work to look at MetaMedium as a *research
package*: the paper, the hero demo inside it, the demos it links, and the
design language that ties them to John's other canvas work. The engine has
outrun the paper. This plan is how the paper catches up without becoming a
changelog.

---

## 1. What is actually there today

**The paper** (`index.html`, v5, February 2026) is a long-form essay in seven
movements: Problem → Vision (with a 60-year lineage timeline) → Thesis (AI as
meta-word) → Framework (principles, negotiation, semiotics, cognitive lenses) →
Current Development → Scenarios → Future → Conclusion. Light paper palette (DM
Sans, ink on `#f8f6f1`, a red accent). Two live canvases: a **hero** you draw
on (its own inline recognizer: ghost suggestions, whisper labels, relationship
lines) and a **"Try It"** fish canvas in the thesis section (draw a fish, draw
food, the fish eats).

**What was wrong with it on inspection** (fixed 2 Sep 2026):

- *Current Development* described the 2025 prototype ("Doodle 2.0"), linked
  it as *the* demo, and its roadmap listed "LLM integration" under *Future*.
  Rewritten around the three rungs, the no-modes session, living artifacts,
  handwriting and the model drawing; the reference surface is the demo now,
  the 2025 prototype is linked as history.
- CLAUDE.md said the whitepaper shared the demos' dark gold palette. It never
  did. Corrected.
- The engine had dropped the one thing the 2025 prototype did that people
  loved: **the maths** of a parsed shape (a circle's radius, a triangle's
  angles). Back, in core (`measure.ts`) and in the inspector.

**What is still wrong, and is the substance of v5.1:**

1. **The paper does not show its own thesis.** The hero shows shape
   recognition. The thesis is that a model joins the *reading* as a
   participant, on a canvas that already knows the relations — and nothing
   on the page shows a relation being read, a mark being commanded, a page
   being built from ink, handwriting being read, or a model drawing back.
   The only place that exists is an iframe near the bottom.
2. **Three copies of recognition.** The hero has its own inline detector
   (`getCircleScore`, `getRectScore`, `detectArrowHead`…), diverged from core
   and from the 2025 prototype. It cannot show the three rungs because it does
   not have them. CLAUDE.md's rule is *one core, many surfaces*; the paper's
   own hero violates it.
3. **The prose reads like its authors.** It was written with older models and
   it shows in the tics: triads ("We deserve… We deserve… We deserve…"),
   em-dash chains, "genuine", "truly", claims about what the reader deserves.
   The argument underneath is good and John's; the surface needs an editor
   with a lighter hand.
4. **Two design languages, one author.** The paper is light paper; the demos
   are dark gold; John's personal site is sea-deep cyan with JetBrains Mono,
   and its fish engine is the most polished canvas John has. The paper embeds
   a dark demo in a light page and calls it a seam. CLAUDE.md pins that a
   deliberate MetaMedium style is "still to be defined (John has one in
   mind)". That decision is upstream of everything visual below.

---

## 2. The idea that makes v5.1 possible: replays as figures

The session engine is **event-sourced**: state is a pure function of the
log, and every model reply is a `propose`, `answer`, `code` or `stroke` event
that was recorded when it happened. So a *recorded session* — the canonical
loop, run once against a real model — replays deterministically in any
browser, with no model attached, at any speed, and every intermediate state
is inspectable.

That is a figure. Not a screenshot, not a video: the actual engine, the actual
events, in the reader's browser, pausable, with the "why" inspector live at
every step. A reader who then draws on it is *continuing the recorded
session* with their own marks.

Everything in §3 is built on this one mechanism: `session.getEvents()` →
JSON in the page → `replay(events, { until, speed })`. The engine needs one
small addition (a `replayUntil(n)` / stepping API and a `stroke` event that
carries its original timing, which it already does). The surface already
renders any state.

---

## 3. The demos, as the paper's spine

Each movement of the paper gets the demo that shows *that* claim, in place,
where the claim is made. Every demo is the same engine and the same bundle.
Numbered by where they go, not by build order.

| # | Where | What the reader does / sees | Shows the claim |
|---|---|---|---|
| **H** | Hero | Draw. The clean form ghosts under the stroke; *the maths* appears beside it (radius, angles, length); a second shape near the first gets a relation line with its measured reason. Name it. | Marks become meaning; the canvas measures, it does not guess. Children and engineers on one canvas (§Vision). |
| **1** | Problem → "Dancing without music" | Two panes: a chat box with the same request typed; the canvas with it drawn. | Interface bandwidth, not model capability, is the limit. |
| **2** | Thesis → "Closing the triadic loop" | A **replay**: circle → bubble; three bubbles + two lines → molecule; the next molecule is recognised; "why?" is answered in the space. Step through it. | The canonical loop. AI as meta-word: the name is a sign the reader made. |
| **3** | Framework → "Negotiation paradigm" | Draw a pentagon. Both readings are held (rectangle 0.44 / circle 0.43) and *neither* is snapped. Draw a box; it is offered clean. | Multi-parse; deferred commitment; nothing wins by silencing. |
| **4** | Framework → "Cognitive lenses" | Teach a command mark by drawing it five times; then use it. | The vocabulary is yours; the system learns your marks, not the reverse. |
| **5** | Current Development | A **replay** of the MVP loop: boxes → circle → mark → "a page" → the page renders inside the ink → ink on the page addresses a region → only that region changes. Then a replay of the flowchart compiling as a graph, and of handwriting becoming a name, and of the model drawing a footer. | The three rungs; the drawing as the brief; living artifacts; the model as participant. |
| **6** | Scenarios | The existing fish canvas, kept — but on the engine: a drawn fish is a *named composition*; food is a named shape; the behaviour is a conversion the palette offers. | Annotation as execution; naming composes. |
| **7** | Future | Left as prose. Deliberately: the paper should stop showing exactly where the work stops. | Honesty about the frontier. |

**H is the one to build first**, because it is the one every reader sees and
the one that replaces the diverged inline recognizer with core. **5 is the
one that unparks the paper**, because it is the thesis shown rather than told,
and it needs only the replay mechanism plus recordings we can make today with
`qwen3:8b` and `qwen3.5:9b`.

What each demo needs from the engine, honestly:

- **H, 3, 4:** nothing new. Core does all of it; the work is surface and CSS.
- **2, 5:** the replay API (small), recordings (an afternoon with a local
  model), and a *stepper* surface control (play / pause / step / scrub).
- **6:** the fish behaviour on the engine — a `behaviour` rep or a conversion
  kind. Real design work; do it last or leave it as the 2025 canvas.

---

## 4. Core love: the prose

Not a rewrite. The argument, the lineage, the scenarios and the future
sections are John's and they hold. A pass with three rules:

1. **Say it once.** Cut the triads, the "genuine"/"truly"/"deserve", the
   restated conclusions. The Conclusion in particular says the same thing four
   ways; it should say it once and stop.
2. **Every claim about the system points at a demo or is cut.** "Draw a
   circle and it becomes a recognized shape" → next to the hero. "Name a
   pattern and the system learns your vocabulary" → next to replay 2. Claims
   nothing shows go into *Future*, plainly.
3. **The paper says what it learned.** MVP.md §7, KEYFRAMES.md and ROADMAP.md
   record real findings — fixed thresholds are about the hand not the world;
   corner count is fragile and extent is not; a tie broken by a constant is
   not a ranking; a model handed rects writes absolute positions; the
   drawing is the brief. Four or five of these belong in *Current
   Development* as short, concrete paragraphs. They are what a research
   paper is for, and they are the part no older model could have written
   because they had to be found.

Also: the overview is fine; the byline "Product Designer" undersells a paper
with a benchmarked engine behind it; the footer's "Made using Claude Code"
should say what that meant (the models did the typing; the decisions, the
lineage and the taste are John's).

---

## 5. Design: one author, three palettes

The contrast the paper embeds — light page, dark demo — is a seam because
nobody decided it. The options, in the order I would consider them:

- **A. The paper goes to the instrument palette.** The demos' dark gold
  (`#0a0a0f` / `#e8e4d9` / `#c9a84c`, Space Grotesk) becomes the paper's too.
  Every embedded canvas then matches. Cost: a full CSS pass on `index.html`;
  the lineage timeline and figures need re-tinting. The paper becomes a
  *surface* in the same family as the thing it describes.
- **B. The demos take on paper.** Embedded canvases render on the paper
  ground with ink-coloured strokes, which is, after all, what "ink over living
  artifacts" says. The reference surface keeps its dark instrument look for
  working in. Cost: a `theme` in `session-engine.html` (it is one palette
  block). The hero already draws dark ink on light paper, so this is the
  smaller move.
- **C. The site's language.** Sea-deep cyan, JetBrains Mono, the fish. It is
  the most polished canvas work John has and it is *his* — but CLAUDE.md is
  explicit that the two systems are separate by intent, and the paper is a
  paper, not a portfolio page.

My recommendation is **B for v5.1** — it is cheap, it is honest to the metaphor,
and it defers the real question. The real question is the pinned one: *what
is the deliberate MetaMedium style?* John has one in mind. That decision
should come before A or C, and v5.1 should not make it by default.

What the fish canvas *does* contribute, regardless of palette: it is the
proof that a drawn thing can be alive on the page without a model, and its
engine (`fish-engine.js`) has solved wall physics, rooms, and idle behaviour
that a "named composition that behaves" would need. Demo 6 should borrow the
engine, not the look.

---

## 6. Sequence

Each step shippable on its own; each ends with something a visitor can see.

1. **Hero on core (H).** Replace the inline recognizer with the bundle;
   clean-form ghost, the maths, one relation. Delete the third copy of
   recognition. *Visible:* the first thing anyone sees is the engine.
2. **Replay API + stepper.** `session.replay()`, the surface's play/step/scrub
   control, and recordings of the canonical loop and the MVP loop made with
   local models. *Visible:* demos 2 and 5, in place.
3. **Theme B.** The embedded canvases on paper. *Visible:* no seam.
4. **Prose pass (§4)**, with the findings paragraphs. Version bump to 5.1;
   changelog line in README; v5 to `archive/` with a redirect stub, as v4 was.
5. **Demos 3 and 4** (negotiation, the taught mark). Small; surface only.
6. **Demo 6**, or the decision to keep the 2025 fish canvas as-is and say so.

Steps 1–4 are v5.1. Steps 5–6 can follow without a version bump.

---

## 7. Decisions needed from John

- **The style.** B now and the pinned decision later, or make the pinned
  decision now? (§5)
- **The byline and the framing.** Product designer, or researcher-designer
  with a working engine? It changes the paper's register.
- **The fish.** Keep the 2025 canvas as the scenario demo, or move it onto the
  engine as a named composition that behaves? (Demo 6)
- **The lineage timeline.** Keep collapsible at 60 years, or cut to the dozen
  entries the thesis actually leans on and link the rest to the resources
  page?

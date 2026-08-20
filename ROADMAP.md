# MetaMedium Roadmap — Mid-2026 Refresh

**Date:** June 2026 · last revised August 2026
**Status:** Active plan
**Supersedes:** the day-by-day roadmap in the old CLAUDE.md; sequences (does not replace) `archive/PRD-v4-LLM-Grounded.md` and `ARCHITECTURE-v5-UNIFIED-ENGINE.md`

---

## The Vision, Restated

MetaMedium's thesis: drawing is a language, and AI is the "meta-word" that lets
marks carry meaning. The system grounds strokes geometrically (fingerprints,
spatial graphs), lets users name what they draw (a personal visual vocabulary),
composes those names recursively (bubble → molecule), and uses LLMs not as a
chat box but as an interpreter operating over that grounded substrate.

The canonical loop that proves the thesis:

> draw circle → save as "bubble" → draw 3 bubbles + 2 lines → save as
> "molecule" → system recognizes "molecule" automatically → ask "why?" and get
> grounded reasoning.

Everything below is sequenced to get that loop **into one shippable demo** and
**visible inside the whitepaper itself**.

---

## Where Things Actually Stand

*What each thing **is** lives in the repo map in
[CLAUDE.md](CLAUDE.md#repository-map) — the single inventory. This table
tracks only **status**. Experiments are tracked in
[EXPERIMENTS.md](EXPERIMENTS.md).*

| Artifact | Status (Aug 2026) |
|---|---|
| `metamedium-core/` | **Shipped and canonical.** Geometry, recognition, spatial, session engine. 86 tests, CI-enforced, browser bundle committed |
| `index.html` (Whitepaper v5) | Polished; "Current Development" still links only the heuristic demo — **v5.1 is the open work** |
| `doodle2-canvas.html` | Polished; heuristics + spatial graph + library; **no LLM**. Not yet on core |
| `metadoodle1.html` | Working prototype; diverging copy of the flagship. Not yet on core |
| `Demos/session-engine.html` | Live reference surface for core: canvas + "why" inspector + **model participants** + **answers placed in the canvas** |
| `Web App Skeleton/` | Builds, lints, tests green; no compositions; not wired to anything shipped |
| `metamedium-core-schema.md` | **Load-bearing** — the node model is implemented via v6 (was "plan only") |
| `ARCHITECTURE-v5-UNIFIED-ENGINE.md` | Partly superseded; MoE/embedding half still deferred (and now prototyped in `lens-canvas/`) |
| `archive/PRD-v4-LLM-Grounded.md` | Archived; tiered escalation partly built, MCP server unbuilt |

### Three tensions blocking progress

1. **Fragmentation.** ~~Recognition logic now lives in at least four places~~
   **Half-fixed (June 2026).** `metamedium-core` exists and is canonical, so
   there is now one place for new logic. The diverged copies in
   doodle2-canvas, metadoodle1, Web App Skeleton and v2-poc are still there —
   fragmentation ends when Demo v3 converges them, not before.
2. **The whitepaper doesn't show the thesis.** Still true — it argues "AI
   beyond chat" and links a demo with no AI in it. **Deliberately not the next
   move:** the honest fix is to make the thesis true in the engine first (v7),
   then show it. Parked, not forgotten.
3. **Plans have outpaced shipping.** ~~Three architecture documents, zero
   shared code.~~ **Addressed (June 2026)** — v6 was written *and* built in the
   same pass, and the cure holds: the next document should be a demo.

---

## What's Next

### → **MVP: Ink Over Living Artifacts** — ✅ **built (19 Aug 2026)**

**[MVP.md](MVP.md)** defines the product, and the loop it defines now runs end
to end in `Demos/session-engine.html`:

> Draw boxes on an infinite canvas → zoom out and circle the set → cross it with
> a command mark **you taught the system by drawing it five times** → a freeform
> prompt appears → *"website with the copy in the squares"* → a real page renders
> in the canvas, with your ink still outlining its divs to the pixel → draw on
> that page and the ink resolves to the regions underneath it → prompt again and
> only those regions change. Scratch anything out to erase.

The reckoning held: it was the existing state machine with three substitutions —
`command` is a learned `check`, `prompt` is a third suggestion kind, `generate`
is a `bless` that attaches a `'code'` rep. Core grew five small modules
(`commandmark`, `erase`, `regions`, plus `teach`/`code` events and
`agent.generate`); the work was in the surface, as predicted.

**215 core tests** (+87), plus `Demos/session-engine.e2e.js` — a 17-step check
that drives the whole loop through the real UI in a browser.

Three engine bugs surfaced only because zoom exists, and all three are recorded
in MVP.md §7: fixed pixel thresholds are about the *hand*, not the world;
`isStrokeClosed` contradicted its own documented intent at the small end; and a
closed stroke must never be read as a scratch.

**Recognition and gesture refresh (19 Aug 2026).** A hand-drawn rectangle read
as a triangle. Benchmarked over 1080 hand-drawn strokes, top-reading accuracy
went **40.4% → 99.9%** (rectangles 10% → 100%). Same pass: the command gesture,
which had never actually been *defined* — the rule was "open, 1–2 corners,
smaller than the lasso", which fires on an L, a V and an upside-down caret. It
is now a check with eight scale-free measurements including orientation, and
`BUILTIN_COMMAND_MARK` is a signature learned the same way a taught mark is
rather than a special case in the code. 271 core tests.

Both mistakes had the same shape: **a threshold stated in the wrong space**
(point indices instead of arc length, pixels instead of ratios) and **a decision
made by a constant instead of a measurement**. Details in MVP.md §7.

**Real models, and the parse (19 Aug 2026).** Pointed at real Ollama, generation
failed in the way MVP.md §6.2 predicted: asked for a positioned page,
`devstral:24b` returned good copy and no positioning at all. The fix was to stop
asking. `metamedium-core/src/parse/` reads the drawing as a **layout** —
recursive XY-cut into `column(header, row(left,right), footer)` with the drawn
proportions — and emits it as flexbox itself; the model is asked only for each
region's content. Geometry became an invariant instead of a request, verified at
**zero pixels of drift** off the live DOM.

It also made small models viable: `qwen3:8b` now produces a correct, semantic
page in 44s, where the unconstrained contract needed a 24B code model to get
close and still drifted. 310 core tests.

**The canvas on its own (20 Aug 2026).** The differentiator is not the model, it
is a no-modes contextual surface that intelligence plugs into. So: a relation
vocabulary (insideness, nearness, alignment, direction, peerhood — measured,
scale-free, carrying strength), a **library of concepts** matched against it
(row, column, frame, flow, grid, labelled), and a **command palette** offering
what those marks could become. The command mark now reads *backwards* over a
temporal window, so striking through one of four boxes you just drew acts on all
four — no lasso, no mode.

Crucially the palette leads with conversions that need **no model at all**: tidy
a wonky row onto one line, match sizes. Ink is never destroyed — a moved mark
keeps its original stroke and gains a transform, so undo springs it back.

Routing is now explicit (Tier 0 first; models only for what it cannot do), and
the transport is injectable, so a participant can be answered by hand — any
model takes part through the same channel, including one with no API.
361 core tests, 27-step browser e2e.

### → **Next: the three keyframes** — [KEYFRAMES.md](KEYFRAMES.md), under review

The concept library was built open-ended, which is the right end state and the
wrong starting point: nothing constrains it, so there is no way to tell whether
it is finished or correct. The sprint narrows it to three rungs with **closed
vocabularies** — shape → diagram-shape → code — and makes the mappings between
them a table you can read rather than predicates you have to trust. Open-endedness
returns later as additions to a vocabulary, not as a different mechanism.

The missing rung is the middle one: what a mark *plays* (container, node, edge,
label, annotation) as against what it *is*. It is the link between "I see a
rectangle" and "I can write a div", and it is also what lets a drawing have a
**genre** — a page and a flowchart should not compile the same way.

**Still open after that:** handwriting (v7 Stage E), so "the copy in the squares"
can be literal rather than typed. Deliberately not a blocker: the sprint's `text`
shape gives a mark the `label` role without needing to read it.

### → **v7: Participants and Tiers** — the active engine plan

**[ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md](ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md)**
holds the engine design. **Stages A, C and D have shipped:** a model joins as a
peer through the `propose` channel the engine already had, offers *several*
readings held beside Tier 0's, answers questions *into* the canvas, and now
builds living code from a drawing (D, absorbed and raised by MVP.md).
Remaining: handwriting (E).

The target is **the conversation benchmark**: a human and an AI holding a
conversation *on the canvas* — both contributing marks, both building library
entries, questions answered into the space, diagrams parsed into code. MVP
transport is one OpenAI-compatible adapter (Ollama, LM Studio, and OpenRouter
are the same client with a different base URL), plus the Anthropic client for
Tier 2.

### Whitepaper v5.1 — "Show, don't tell" — **deferred by decision**

> 📌 **Parked (Aug 2026, John's call):** *"leave whitepaper alone until we know
> this works."* The document should demonstrate a thesis that is proven, not a
> promising one. Revisit after v7 Stage C. Everything below stays valid as the
> plan for when it resumes.

Goal: the live document demonstrates its own argument. Pure content/curation
work, no engine changes required.

- **Embed v2-poc as an interactive figure.** Text reflowing around the
  reader's own drawn shapes, inside the whitepaper, is the thesis made
  tangible. Embed via iframe in or near "The Vision: As We May Sketch."
- **Rewrite "Current Development" as a demo gallery** with honest one-line
  framing per artifact: flagship canvas (grounding + vocabulary), metadoodle1
  (tiered LLM interpretation, runs fully local), v2-poc (medium blending),
  micro-demos.
- **Add a short, public roadmap section** (condensed from this file) so the
  document sets expectations for what's next.
- ~~**Hygiene:** move `MetaMedium_Whitepaper_v4.html.bak` to `archive/`; make
  README.md a real front door~~ ✅ done (June 2026 cleanup pass — see below).

Ship criterion: a first-time visitor can experience draw→recognize→name and
drawing-responsive text without leaving the whitepaper, and can find the
LLM-tier demo in one click.

### ~~Demo v3 — "One demo on one core"~~ → **superseded, mostly done**

> **Status (Aug 2026): Steps 1 and 3 shipped; Step 2 is withdrawn as written.**
> The successor plan is **[ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md](ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md)**.

**Step 1 — Extract `metamedium-core`. ✅ Done (June 2026).** Driven by the
no-modes user story rather than as an abstract refactor. Geometry, recognition,
and spatial ported behavior-identically with tests, **plus the session engine**
(lasso → check → summon → bless → artifact). The browser bundle ships at
`Demos/metamedium-core.browser.js`, CI-checked against source. Design:
`ARCHITECTURE-v6-SESSION-ENGINE.md`.

**Step 2 — Converge the two monoliths into `canvas.html`. ❌ Withdrawn.**
Written in June, before v6 existed. `doodle2-canvas.html` and `metadoodle1.html`
both implement a **mode-and-tool interaction model that v6 deliberately
abandoned** — merging them would port the old model forward and leave the
no-modes engine as the side project. The real successor is
`Demos/session-engine.html` grown up: 554 lines against their ~500KB each, and
the only surface actually built on the engine. The monoliths get archived with
redirects once it reaches parity on polish, touch, and undo/redo. See v7 §7.

**Step 3 — Close the canonical loop. ✅ Done in the engine (June–Aug 2026).**
Composition save, re-recognition, and grounded "why" all work end-to-end, and
were verified in a browser: draw 3 circles + 2 lines → lasso → check → summon
(*"holds 5 marks · sig 3×circle + 2×line"*) → name it → **0 loose · 1 artifact**
→ draw the same arrangement elsewhere → the canvas offers *"molecule? circle + ✓
to confirm"* as a held candidate. The inspector shows the grounding throughout.
The executable spec is `metamedium-core/src/session/session.scenario.test.ts`.

**What Step 3 did *not* deliver:** "explain why" was Tier 0 grounded reasoning,
not an LLM. ✅ **Now delivered by v7 Stage C** — models answer questions into the
canvas, and Tier 0's reasoning still stands beside theirs.

---

## Dev-Cycle Operating Model (what this sets up)

- **One core, many surfaces.** All recognition changes land in
  `metamedium-core` with tests; demos and the React app consume builds.
  Experiments may fork and re-implement to move fast — that is what makes them
  cheap — but a proven idea comes back into core with tests rather than living
  on in a fork (see EXPERIMENTS.md).
- **CI on the core.** GitHub Action: typecheck + vitest on every PR. The
  stroke-fixture suite makes recognition changes reviewable ("this PR changes
  12 of 200 fixture interpretations") instead of vibes-based.
- **Ship something visible weekly.** Inherited from the original philosophy
  and still right: no infrastructure-only weeks. Even during core extraction,
  each week ends with a demo or whitepaper change a visitor can see.
- **Version the artifacts like the documents.** Whitepaper v5.1, Demo v3 —
  changelog section in README, old versions in `archive/`, URLs stable.
- **CLAUDE.md stays current.** It is the onboarding doc for AI-assisted dev
  cycles; it gets updated in the same PR as any structural change.

## Deliberately Deferred (sequenced, not abandoned)

- **MCP server** (PRD-v4 Phase 1): high leverage, but only worth building on
  top of the extracted core. Slot: right after Demo v3, when core functions
  exist to wrap as tools.
- **Onboarding/calibration + user fingerprints** (PRD-v4 Phase 5): needs the
  converged flagship as its host. After Demo v3.
- **Embedding space, MoE router, expert feedback loops** (ARCH-v5 Phases
  4+): keep as the magnum-opus target; revisit once corrections data from a
  real demo exists to justify them. **Partly de-risked already** —
  `lens-canvas/` runs confidence-scored expert routing at small scale and it
  works (see EXPERIMENTS.md), so the router is less speculative than when this
  was written.
- **Graph schema migration** (metamedium-core-schema.md): adopt incrementally
  — the spatial graph in core can grow toward "everything is a node" without
  a big-bang rewrite. `lens-canvas/` is the working precedent.
- **Point primitive** (`Assets/point-primitive-design.md`): dots/markers as
  first-class shapes, plus a fix for stroke-endpoint-vs-corner confusion.
  Designed, never implemented; still a real failure mode in core.
- **CI for `lens-canvas/`**: it has 19 vitest tests that nothing runs
  automatically. Cheap to add whenever the experiment goes from parked to
  load-bearing.

## Done: June 2026 Cleanup Pass (soil prep)

- Repo hygiene: `.DS_Store` files untracked and gitignored; duplicate
  `Assets/metamedium-core-schema.md` removed; `iceberg-sketches copy.html`
  moved to `archive/`; whitepaper v4 (the fuller `.bak` version) restored at
  `archive/MetaMedium_Whitepaper_v4.html` with a redirect stub at its old
  published URL.
- README rewritten as the front door (whitepaper, demo gallery, plan, dev
  instructions); CLAUDE.md normalized to the actual repo.
- Web App Skeleton validated: `npm run build` (typecheck + bundle) green;
  lint reduced from 59 errors to 0 (remaining `any`s demoted to warnings
  until core extraction types them properly).
- **Vitest suite added** (41 tests: geometry, recognition, spatial) with
  synthetic stroke generators in `src/test/strokes.ts` — the seed of the
  `metamedium-core` regression suite. CI workflow runs lint + test + build
  on every push/PR.
- ~~⚠️ **Action needed (John):** v2-poc source was gitignored and never
  committed~~ ✅ **done (Aug 2026)** — `v2-poc/src/main.ts` recovered and
  committed from the original machine.

## Done: June 2026 Session-Engine Push (v0.1 + v0.2)

Following the cleanup pass, the no-modes user story was crystallized in
`ARCHITECTURE-v6-SESSION-ENGINE.md` and implemented in `metamedium-core/`:
node model, gesture grammar, session engine (summon/bless/artifact),
event-sourced undo, erase with artifact degradation, wire inference, and a
size-relative overshoot fix. 76 tests including the canonical-loop executable
spec. A browser bundle + reference surface (`Demos/session-engine.html`) make
the engine visible and were verified end-to-end in headless Chromium.

## Done: August 2026 Unification + Docs Pass

Two lines of work had diverged — a remote session branch (metamedium-core, v6,
reference surface) and local work (lens-canvas Phases 1–4, the explainer video,
vision PoC). Both are merged into `master`; the stale `claude/*` branches are
deleted and CI is green.

The docs were then consolidated on a **one definition, one home** rule:

- **Thresholds left prose.** Recognition numbers had been restated in ten
  documents and had drifted — CLAUDE.md's own copy described an older engine
  (straightness-banded detection, a 0.15 closure gap) while the shipped engine
  is multi-parse with a 0.20 gap. The engine and its tests are now the only
  spec; docs describe shape and cite code. `Assets/recognition-strategy.md`
  keeps the *reasoning*.
- **One inventory.** CLAUDE.md's repo map is it; README and ROADMAP link to it.
- **Experiments got a tier.** `EXPERIMENTS.md` names what each probes and what
  it feeds back, without letting any of them read as the main project.
- **Superseded plans archived, not deleted** — PRD v3.2 and the Web App
  Skeleton migration guide moved to `archive/`; ARCHITECTURE-v5 and the
  `Assets/` design notes bannered with what's still live in them.
- **Design systems documented as a deliberate split** (MetaMedium vs.
  personal-site language), with the MetaMedium style pinned as to-be-defined.

## The Accounting (August 2026)

An honest ledger before the next plan. **Done** = works and is verified.
**Partial** = exists but doesn't do what the name implies. **Not started** =
say so plainly.

### Done

| | Evidence |
|---|---|
| Geometry, fingerprinting, recognition | `metamedium-core/src/{geometry,recognition}.ts`, 86 tests, CI-enforced |
| Spatial graph + clustering | `src/spatial.ts` |
| **The node model** — type emerges from connections | `src/session/nodes.ts`; the schema doc is implemented, not aspirational |
| **The session engine** — no modes, deferred commitment | `src/session/session.ts`; gesture grammar in `gesture.ts` |
| **The canonical loop, end to end** | Executable spec + verified live in `Demos/session-engine.html` |
| Multi-parse recognition (nothing wins by silencing) | `analyzeStroke` returns ranked candidates with `reasoning` |
| Event-sourced undo; erase with artifact degradation | `session.undo()`, `session.erase()` |
| **Participants as first-class citizens** | `join`, `propose`, attribution, `Capability 0–3` — v0.3a |
| Browser bundle + reference surface | `metamedium-core.browser.js`, CI drift check |
| CI on core and the React app | `.github/workflows/ci.yml` |
| Repo unified; docs consolidated | Aug 2026 (below) |

### Partial

| | What's actually true |
|---|---|
| "Explain why" | **Tier 0 only.** Grounded heuristic reasoning — honest and offline, but no model is involved |
| Tiered LLM interpretation | Wired in `metadoodle1.html` (LM Studio + WebLLM), **not** on the engine. The core has the socket and nothing plugged into it |
| Claude / Tier 2 | `Web App Skeleton/src/llm/claudeInterpreter.ts` exists but pins **two retired model IDs** — it would 404 today |
| The flagship demo | `session-engine.html` proves the loop but is framed as a dev reference surface; the polished monoliths are on the old interaction model |
| Whitepaper | v5 is live and polished, but still links only the heuristic demo — it does not show its own thesis |
| Web App Skeleton | Builds, lints, tests green; not wired to anything shipped |

### Not started

- **Any model in the engine loop** — the propose channel has never carried an LLM proposal
- **Diagram → code**, handwriting recognition, explanation reps on canvas
- MCP server (PRD-v4 Phase 1)
- Point primitive (`Assets/point-primitive-design.md`)
- Onboarding / calibration / user fingerprints
- Embedding space (MoE routing is prototyped in `lens-canvas/`, not in core)

**The one-line summary (as of the accounting):** the substrate is real and the
loop is closed; there has never been a model in it. v7 is about that, and only
that.

> **Update — v7 Stages A and C shipped (Aug 2026).** There is now a model in the
> loop: it joins as a peer, offers several readings held beside Tier 0's, and
> answers questions into the canvas. The "Not started" list above shrinks by its
> first two lines. Diagram→code and handwriting remain.

## Success Criteria

- [x] `metamedium-core` package: zero framework deps, tested, ESM + browser builds
- [x] Canonical bubble→molecule loop works in a published demo (`Demos/session-engine.html`)
- [x] CI green on core; recognition changes land via small, tested PRs
- [ ] **A model participates** — an LLM proposal, attributed and blessed, on the canvas (v7 Stage A)
- [ ] **The conversation benchmark** — human and AI build library entries together, ask/explain, diagram→code (v7)
- [ ] Tier 2 "explain why" from a real model with a user-supplied key (v7 Stage B–C)
- [ ] One flagship demo on core; doodle2-canvas/metadoodle1 archived with redirects
- [ ] Whitepaper v5.1 live — **deliberately deferred until the above works** (John, Aug 2026: "leave whitepaper alone until we know this works")

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
| `Demos/session-engine.html` | Live reference surface for core: canvas + "why" inspector + second participant |
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
2. **The whitepaper doesn't show the thesis.** It argues "AI beyond chat" but
   links to a demo with no AI in it. The LLM-grounded work (metadoodle1) and
   the medium-blending work (v2-poc) exist but aren't surfaced.
3. **Plans have outpaced shipping.** ~~Three architecture documents, zero
   shared code.~~ **Addressed (June 2026)** — v6 was written *and* built in the
   same pass, and the cure holds: the next document should be a demo.

---

## The Two Next Versions

### Whitepaper v5.1 — "Show, don't tell" (fast, ~1–2 weeks)

Goal: the live document demonstrates its own argument. Pure content/curation
work, no engine changes required — this is the near-term value delivery.

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

### Demo v3 — "One demo on one core" (~4–6 weeks, the dev-cycle setup)

Goal: converge the forks into a single flagship demo built on an extracted,
tested core library. This is ARCHITECTURE-v5 Phases 1–3, scoped down to what
the demo needs — no MoE router, no embedding space yet.

> **Update (June 2026):** Step 1 happened — driven by the no-modes user story
> rather than as an abstract refactor. `metamedium-core/` now exists with
> geometry/recognition/spatial ported (behavior-identical, tested) **plus the
> session engine** implementing lasso → check → summon → bless → artifact.
> See `ARCHITECTURE-v6-SESSION-ENGINE.md` (the active design) and the
> executable spec at `metamedium-core/src/session/session.scenario.test.ts`.
> Step 1 is now complete: the browser (IIFE) bundle ships at
> `Demos/metamedium-core.browser.js`, CI-checked against source.

**Step 1 — Extract `metamedium-core` (week 1–2).**
- New `metamedium-core/` package: geometry, fingerprinting, recognition
  heuristics, spatial graph, library/matching — pure TypeScript, zero
  framework dependencies. Source of truth: Web App Skeleton's `src/core` +
  the best of doodle2-canvas's heuristics (they have diverged; reconcile by
  test, not by guess).
- Vitest unit tests on every pure function. Recorded-stroke fixtures (capture
  real strokes from doodle2-canvas as JSON) become the regression suite.
- Two build outputs: ESM for the React app, UMD bundle for the standalone
  HTML demos. This is what lets the monoliths shrink instead of fork.

**Step 2 — Converge the flagship (week 2–4).**
- One demo (working name: `canvas.html`, successor to both doodle2-canvas and
  metadoodle1) consuming the UMD core. Keep doodle2-canvas's polished UI;
  port metadoodle1's tiered LLM layer onto it.
- Tier policy (simplified from PRD-v4): **Tier 0** core heuristics (always,
  offline); **Tier 1** in-browser WebLLM (optional download); **Tier 2**
  Claude API, bring-your-own-key (Haiku for interpretation, Sonnet for
  "explain why"). Escalate only on low confidence or explicit user ask.
- Old files move to `archive/` with redirects; published URLs keep working.

**Step 3 — Close the canonical loop (week 4–6).**
- Composition save + recognition in core (spatial-graph fingerprints — Day
  3–5 of the old roadmap, finally done once, in one place).
- "Explain why" surfaced in the flagship via Tier 2.
- Record a 60-second video of the bubble→molecule loop for the whitepaper.

Ship criterion: the canonical loop works end-to-end in the published flagship
demo, offline-first, with LLM tiers as progressive enhancement.

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

## Success Criteria

- [ ] Whitepaper v5.1 live: embedded reflow figure, demo gallery, roadmap section
- [ ] `metamedium-core` package: zero framework deps, tested, ESM + UMD builds
- [ ] One flagship demo on core; doodle2-canvas/metadoodle1 archived with redirects
- [ ] Canonical bubble→molecule loop works in the published demo
- [ ] Tier 2 "explain why" works with a user-supplied Anthropic key
- [ ] CI green on core; recognition changes land via small, tested PRs

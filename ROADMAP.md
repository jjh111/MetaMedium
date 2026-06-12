# MetaMedium Roadmap — Mid-2026 Refresh

**Date:** June 2026
**Status:** Active plan
**Supersedes:** the day-by-day roadmap in the old CLAUDE.md; sequences (does not replace) PRD-v4-LLM-Grounded.md and ARCHITECTURE-v5-UNIFIED-ENGINE.md

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

| Artifact | Role | Status |
|---|---|---|
| `index.html` | Whitepaper v5 "AI Beyond Chat" (live on GitHub Pages) | Polished; "Current Development" section links only to the heuristic demo |
| `doodle2-canvas.html` | Flagship canvas demo | Polished; heuristics + spatial graph + library; **no LLM** |
| `metadoodle1.html` | Fork of flagship + tiered LLM (WebLLM, LM Studio) + voice | Working prototype; diverging copy of the flagship |
| `v2-poc/` | Drawing-responsive text reflow (pretext) | Newest work; the most direct demo of "drawing and text are one medium" |
| `Web App Skeleton/` | React/TS/Zustand rebuild + Claude API interpreter skeleton | Builds and runs; no compositions; not wired to anything shipped |
| `PRD-v4-LLM-Grounded.md` | LLM-grounded architecture + tiered escalation + MCP spec | Plan only |
| `ARCHITECTURE-v5-UNIFIED-ENGINE.md` | Unified engine: experts/MoE, three state planes, `metamedium-core` extraction | Plan only |
| `metamedium-core-schema.md` | Graph data model (everything is a node) | Plan only |
| `Demos/`, `test-llm.html`, `skills/` | Micro demos, LLM test harness, Claude Code skills | Supporting material |

### Three tensions blocking progress

1. **Fragmentation.** Recognition logic now lives in at least four places
   (doodle2-canvas, metadoodle1, Web App Skeleton, v2-poc), each a monolithic
   copy. Every improvement costs 3–4×. This is the single biggest blocker to
   dev cycles, and it is exactly what ARCHITECTURE-v5 Phase 1 (extract
   `metamedium-core`) fixes.
2. **The whitepaper doesn't show the thesis.** It argues "AI beyond chat" but
   links to a demo with no AI in it. The LLM-grounded work (metadoodle1) and
   the medium-blending work (v2-poc) exist but aren't surfaced.
3. **Plans have outpaced shipping.** Three architecture documents, zero shared
   code. The cure is not another architecture doc — it's picking the smallest
   slice of v5 that unblocks everything else and shipping it.

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
- **Hygiene:** move `MetaMedium_Whitepaper_v4.html.bak` to `archive/`; make
  README.md a real front door (canonical links: whitepaper, flagship demo,
  roadmap).

Ship criterion: a first-time visitor can experience draw→recognize→name and
drawing-responsive text without leaving the whitepaper, and can find the
LLM-tier demo in one click.

### Demo v3 — "One demo on one core" (~4–6 weeks, the dev-cycle setup)

Goal: converge the forks into a single flagship demo built on an extracted,
tested core library. This is ARCHITECTURE-v5 Phases 1–3, scoped down to what
the demo needs — no MoE router, no embedding space yet.

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
  `metamedium-core` with tests; demos and the React app consume builds. New
  experiments (like v2-poc) import the core instead of re-implementing it.
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
  real demo exists to justify them.
- **Graph schema migration** (metamedium-core-schema.md): adopt incrementally
  — the spatial graph in core can grow toward "everything is a node" without
  a big-bang rewrite.

## Success Criteria

- [ ] Whitepaper v5.1 live: embedded reflow figure, demo gallery, roadmap section
- [ ] `metamedium-core` package: zero framework deps, tested, ESM + UMD builds
- [ ] One flagship demo on core; doodle2-canvas/metadoodle1 archived with redirects
- [ ] Canonical bubble→molecule loop works in the published demo
- [ ] Tier 2 "explain why" works with a user-supplied Anthropic key
- [ ] CI green on core; recognition changes land via small, tested PRs

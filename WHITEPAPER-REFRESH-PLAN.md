# Whitepaper refresh — the lede first, one demo family

**Date:** 10 September 2026 · **Status:** proposal, for John to cut down
**Companions:** `WHITEPAPER-v5.1-PLAN.md` (partly landed), `ROADMAP.md` §4
("The surface becomes the flagship"), `SURFACE-v9-PLAN.md`, `EXPERIMENTS.md`

The essay is good. The order is wrong. The page argues for ~2,500 words before
it shows the thing the argument is about, and the first interactive a reader
gets is a fish on a canvas that is not the engine. This plan reorders the
evidence, retires the fish as a standalone artifact in favour of one demo
family, and audits the duplicates.

---

## 1. Measured: the page today

32,350 px tall (~32 screens), ~5,700 words of essay, on a 1440 px viewport.

| Depth | Section | Words | What the reader gets |
|---|---|---|---|
| 0% | Hero | — | Draw; shape recognition (engine, teaser) |
| 3% | Overview | 133 | The claim |
| 5% | The Problem | 413 | Inert tools, bandwidth |
| 13% | The Vision + Lineage | 1,194 | Memex, children, 23-entry timeline |
| 25% | The Thesis | 902 | Meta-word, blending, triadic toggle |
| **39%** | **Canonical loop replay** | — | **The product, for the first time** |
| **42%** | **The fish canvas** | — | **The first thing a reader can play** |
| 44% | The Framework | 1,210 | Principles, negotiation, semiotics, lenses |
| 66% | Current Development | 883 | Rungs, MVP replay, roadmap |
| 72% | Live surface embed | — | The working surface |
| 84% | Scenarios | 147 | Four story cards |
| 87% | The Future | 599 | Alignment, beyond 2D |
| 96% | Conclusion | 219 | The claim again |

Read that as a reader's journey: ~2,500 words of theory, then the first
replay at 39%, then a **fish** — hand-rolled, pre-engine — at 42%, then
another 1,200 words of theory, and only at 66–72% the working engine and its
surface. The paper's case is that a working engine exists. That is the lede,
and it is in the third act.

## 2. The three problems

1. **The lede is buried.** The canonical-loop replay — the single most
   compelling artifact the project owns — sits at 39% depth; the live surface
   at 72%. The page is a linear essay whose evidence arrives after the
   argument instead of before it.
2. **The fish is a detour and a duplicate.** The "Try It" canvas is ~450 lines
   of inline code (its own script, CSS and markup) demonstrating a behaviour
   the surface now owns properly (named marks, a blessed behaviour, the tank /
   a `run` program). The same demo exists again at `Demos/fish-demo.html`.
   A reader's first interactive experience teaches the wrong product — and
   they cannot replay it, inspect it, or continue it.
3. **Duplication and drift.** Three engine embeds tell overlapping versions of
   one story; the principle cards restate the Development status; the loop is
   narrated in prose in four places; README still calls `doodle2-canvas.html`
   "the flagship" while session-engine is the MVP surface.

## 3. The rule that ends this class of problem: one demo family

**Every interactive on the site is the session engine** — an embedded replay,
a live embed, or a link. The paper carries no second canvas, ever. The hero
is the one exception, and it reads through `metamedium-core` like everything
else. If a demo is wanted that the surface cannot yet show, the surface grows
it (or the paper says it is not built yet) — the paper does not grow a
parallel canvas.

This is the durable half of the plan; the reorder is the visible half.

## 4. The reorder (recommended)

| # | Section | Change |
|---|---|---|
| 1 | Hero | Keep. Optionally add one crumb: *see the loop ↓* |
| 2 | Overview | Tighten to claim + one sentence; end pointing down |
| 3 | **"The loop, running" (new, ~5%)** | **Moved here from Thesis: the canonical-loop replay**, a 2–3 sentence frame, and *Open the surface →*. Target: first engine replay within two screens (≤10%) |
| 4 | The Problem | Keep. It lands harder once the loop has been seen |
| 5 | The Vision + Lineage | Keep; timeline trim is a decision (§10) |
| 6 | The Thesis | Loop and fish leave; meta-word, blending, triadic stay. Thesis returns to theory |
| 7 | The Framework | Keep; status one-liners become pointers to Development |
| 8 | Current Development | Rungs, MVP replay, live surface, roadmap, limitations, gallery. The third act's payoff, no longer the buried lede |
| 9 | Scenarios | Keep; the fish story points at the fish recording when it exists |
| 10 | The Future | Keep |
| 11 | Conclusion | One movement, half the length |

Optional bold variant (John's call): a compact "what the engine reads" strip
(shape → plays → code, one line each) beside the new loop section, so the
three rungs arrive with the demo rather than 60% later. Development then owns
the long version.

**Why not move Development up wholesale?** The essay's argument order
(Problem → Vision → Thesis → Framework) is the paper's spine and it is
conventional and sound. What is missing is a preview of the proof — which is
what §3 achieves with one moved block. The rest of Development stays where a
reader expects the implementation chapter.

## 5. The fish — surface requirement (separate thread executes)

This plan fixes only the visible contract and the paper's slot for it.
**The exact implementation is a separate thread's to choose** — a blessed
behaviour on named marks, a `run` program the library offers, or an example
recording shipped in the library. The contract:

- **R1 — Playable in the surface.** On `Demos/session-engine.html`: draw a
  fish and draw food, name them (handwriting, the field, or the reading), and
  the palette offers *the fish follows the food*. Bless it and it moves. It
  must work with no model joined (Tier 0/1), and degrade honestly if a name
  is needed and absent.
- **R2 — Recordable and embeddable.** The session is recorded to
  `Demos/recordings/fish.json`, replays deterministically with `?replay=`,
  and embeds in the paper exactly like `canonical-loop.json` does.
- **R3 — One home.** The paper's inline fish canvas and its code are deleted;
  `Demos/fish-demo.html` retires to `archive/` (check for published links
  first). The fish exists in one place: the surface.
- **R4 — Borrow the engine, not the look.** The personal site's fish engine
  (`fish-engine.js`) has solved wall/room/idle physics; the surface thread may
  borrow that work. The paper does not embed the personal-site canvas.
- **Acceptance:** a reader can go from the whitepaper to playing
  fish-follows-food inside session-engine in one click; the recorded replay
  plays in the paper with no model and no network.

Sequencing choice for John: replace the fish with a link at reorder time
(Thread A can ship alone), then slot the recording in when Thread B lands —
or hold the fish slot open until the recording exists.

## 6. Duplication audit

Verdicts: **one home** (this becomes canonical), **point** (replace with a
cross-reference), **cut**, **keep** (justified in place).

### Within the whitepaper

| What repeats | Where | Verdict |
|---|---|---|
| The canonical loop, narrated | Overview, Thesis, Development, Conclusion | One home in "The loop, running"; the rest point |
| Fish behaviour | Inline canvas (Thesis); `Demos/fish-demo.html` | One home: the surface (§5); both copies cut/archived |
| Engine embeds (3) | Thesis (canonical loop), Development (MVP replay, live surface) | Keep all three, reposition; label each with its one claim: *names compose* / *ink over a living artifact* / *try it* |
| "Built / Partly" status | Six principle cards vs Development roadmap | Status canonical in Development; principles point at it |
| "AI proposes, never commits" | Overview, Development, Future | Overview states it once; Future owns the unbuilt |
| Meta-word definition | Overview, Thesis prose, callout | Callout canonical; trim prose restatement |
| Conclusion vs Overview | Both | Conclusion says it once, in one paragraph |
| Scenario "Principles:" labels | Scenarios vs Framework | Keep as cross-references (they work) |
| Sketchbook gallery | Development | Keep; consider moving it to a process coda near the end (minor) |

### Between the site and the repo

| What | Where | Verdict |
|---|---|---|
| README demo table | Calls `doodle2-canvas.html` "flagship"; session-engine buried as "No-modes session engine" | Refresh: session-engine is *the* demo; doodle2/metadoodle1 as history |
| Legacy recognition copies | `doodle2-canvas.html`, `metadoodle1.html`, `Web App Skeleton/src/core/` | Known; retirement already owned by ROADMAP §4. The refresh updates links, does not re-litigate |
| `Demos/` experiments (~11 pages: composition-diagram v2/v4, no-modes diagram/graph, waveform, sna-drawing, iceberg, shape-equation, relational-scene, doodle2-v1) | Unlinked from the site; no index, no README | Triage thread: each is either a figure the paper references, or archived to `archive/demos/`; add `Demos/README.md` naming the survivors |
| Fish CSS/JS/markup in `index.html` | ~450 lines | Deleted with §5 |

### Published URLs

Nothing in this plan breaks one: `doodle2-canvas.html` and `metadoodle1.html`
keep their paths until ROADMAP §4's redirect plan runs; the fish had no
published URL to preserve.

## 7. Prose cuts (the "say it once" pass)

- **Conclusion** to one movement; it currently restates §Overview four ways.
- **Overview** stays three short paragraphs; last line points at the loop.
- **Principle cards' status lines** to one word + link (Development holds the
  detail).
- **Findings paragraphs** (from v5.1 §4.3 — extent vs corner count, measured
  confidence, the drawing is the brief) belong in Development, short.
- **Timeline**: keep collapsible, decide the trim (§10).
- **Byline**: "Product Designer" undersells a paper with a benchmarked engine
  — John's call on the register.

## 8. Threads

| Thread | Owns | Depends on |
|---|---|---|
| **A — site reorder** | `index.html`: new loop section, fish out, thesis tidy; ships alone with a link in the fish slot | none |
| **B — surface fish** | The §5 contract inside `Demos/`; produces `recordings/fish.json` | none (parallel) |
| **C — demos triage** | `Demos/README.md`, archive moves, README/ROADMAP link hygiene | none |
| **D — prose + version** | §7; version bump; archive v5 page if the refresh warrants it | A, B |

No two threads touch the same file. Thread A is the one that changes what a
visitor sees; it should go first.

## 9. Sequence (each step shippable)

1. **A**: move "The Loop, Recorded" up as "The loop, running"; fish canvas
   removed (slot links to the surface); Thesis tightened. *Visible:* engine
   replay in the first two screens.
2. **B**: fish on the surface, recorded. *Visible:* the demo the fish wanted
   to be, playable and inspectable.
3. **A₂**: slot the fish recording into the paper (loop section's second beat
   or Scenarios — §10). *Visible:* the fish returns, on the engine.
4. **C**: demos triage + README refresh.
5. **D**: prose pass, version bump, v5 archived with a redirect if the scope
   earns it.

## 10. Decisions for John

1. **Version** — v5.2 (same architecture, new order) or v6 (a new IA, archive
   v5)? This plan works either way; the version is a label on the same moves.
2. **The fish's slot** — second beat in the early loop section, or under
   Scenarios where its story already lives?
3. **Live surface embed** — keep in Development, or link-only and let the
   early replay + one click carry it?
4. **The "what the engine reads" strip** — add beside the loop, or leave the
   rungs exclusively in Development?
5. **Timeline** — the dozen entries the thesis leans on, or all 23 on the
   page?
6. **Byline register** — product designer, or researcher-designer with a
   working engine?

## 11. What this plan is not

Not the surface implementation (§5 is a contract; Thread B owns the how). Not
the brand system (done). Not a prose rewrite — the argument is John's and it
holds; this is an editor's reorder, not a ghostwriter's. Not the engine's
roadmap (`ROADMAP.md` owns that).

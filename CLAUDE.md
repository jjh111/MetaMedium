# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MetaMedium** is a recombinatorial drawing system: interfaces that learn user
vocabularies, recognize compositional patterns in real-time, and evolve through
use. Strokes are grounded geometrically (fingerprints, spatial graphs), users
name what they draw, names compose recursively, and LLMs interpret over that
grounded substrate ("AI as meta-word" — see the interactive whitepaper at
`index.html`, published at https://jjh111.github.io/MetaMedium/).

The canonical loop that proves the thesis: draw circle → save as "bubble" →
draw 3 bubbles + 2 lines → save as "molecule" → system recognizes "molecule"
automatically → ask "why?" and get grounded reasoning.

## Current Status & Plan

**See `ROADMAP.md`** for status and the August 2026 accounting.
`ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md` is the active plan.

Headline: the substrate is real, the canonical loop is closed, and **models are
now in the loop** — v7 Stages A and C have shipped. A model joins as a peer,
offers *several* readings held beside Tier 0's, and answers questions *into* the
canvas. Still open: diagram→code (Stage D) and handwriting (Stage E). Whitepaper
v5.1 stays parked until the conversation benchmark passes end to end.

Architecture documents (chronological; **read v7 then v6 — they're the active pair**):
- `ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md` — **active plan**: putting a model in the loop through the `propose` channel; the conversation benchmark; one OpenAI-compatible transport for Ollama/LM Studio/OpenRouter
- `ARCHITECTURE-v6-SESSION-ENGINE.md` — **active design**: the no-modes session engine (deferred commitment, summoning, promotion ladder, capability tiers), implemented in `metamedium-core/`
- `metamedium-core-schema.md` — graph data model ("everything is a node; type emerges from connections") — load-bearing via v6
- `ARCHITECTURE-v5-UNIFIED-ENGINE.md` — partly superseded by v6; still the reference for the deferred MoE-routing and embedding-space work
- `archive/PRD-v4-LLM-Grounded.md` — **archived**; still the spec for the tiered escalation (Tier 0 heuristics / Tier 1 light LLM / Tier 2 Claude) and the unbuilt MCP server

`EXPERIMENTS.md` covers the side tier (lens-canvas, v2-poc, vision/LLM PoCs,
the explainer video) and what each one feeds back into the platform.

## Repository Map

This table is the **single inventory of the repo** — README.md and ROADMAP.md
link here rather than keeping their own lists. Update it in the same commit as
any structural change.

### Platform (the project proper)

| Path | What it is |
|---|---|
| `metamedium-core/` | **The canonical engine** (TypeScript, zero deps, tested): geometry, recognition, spatial graph, and the no-modes session engine. New recognition/engine work lands HERE |
| `index.html` | **Interactive whitepaper v5** "MetaMedium: AI Beyond Chat" (live on GitHub Pages) |
| `doodle2-canvas.html` | **Flagship demo**: heuristic recognition, spatial graph, library, undo/redo, touch. No LLM. Single-file (~500KB) |
| `metadoodle1.html` | Fork of flagship + tiered LLM recognition (WebLLM in-browser, LM Studio local API) + voice. Single-file (~600KB) |
| `Web App Skeleton/` | React + Vite + TypeScript + Zustand rebuild; Claude API interpreter skeleton in `src/llm/`; recognition/spatial/matching in `src/core/` |
| `Demos/` | Micro demos. **`session-engine.html`** is the live reference surface for metamedium-core (canvas + "why" inspector + model participants + canvas answers; uses the committed `metamedium-core.browser.js` bundle). `build-standalone.mjs` inlines the bundle into a single shareable file. Plus fish, composition diagrams, no-modes graph, etc. |
| `skills/` | Claude Code skills: `metamedium-code` (code patterns), `metamedium-design` (design principles) |
| `Assets/` | Figures and design rationale (recognition strategy, point-primitive proposal) |
| `archive/` | Retired versions and superseded plans, incl. whitepaper v4 (root `MetaMedium_Whitepaper_v4.html` is a redirect stub — keep it) and PRDs v3.2/v4 |
| `.github/workflows/ci.yml` | CI: typecheck + test + build for `metamedium-core` (incl. a bundle-drift check) and `Web App Skeleton`, on every push/PR |

### Experiments (subordinate tier — see `EXPERIMENTS.md`)

Cheap, forked, allowed to re-implement. They de-risk platform bets; they are
not the product. Each entry's rationale and what it feeds back lives in
`EXPERIMENTS.md`.

| Path | What it probes |
|---|---|
| `lens-canvas/` | Infinite canvas, `LensNode` graph, confidence-scored lens routing — a running prototype of the deferred MoE router and the "type emerges from connections" model. Vite + vitest (19 tests). **Not in CI** |
| `v2-poc/` | Drawing-responsive text reflow (chenglou/pretext) — the figure Whitepaper v5.1 is built around. `src/main.ts` + committed `bundle.js` |
| `test-vision.html` | VLM path (Qwen3.5): image-in instead of structured-geometry-in. The control case for the grounded-not-pixels commitment |
| `test-llm.html` | Standalone LLM harness |
| `manim-explainer/` | ~50s explainer video. Source + stills tracked; renders and `media/` cache gitignored (regenerate from the scripts) |
| `playground.html` | Personal sandbox on the personal-site design language |

**Known duplication:** recognition logic still exists independently in
`doodle2-canvas.html`, `metadoodle1.html`, `Web App Skeleton/src/core/`, and
`v2-poc/bundle.js`. As of June 2026, **`metamedium-core/` is the canonical
source** (geometry/recognition ported from the Web App Skeleton with
behavior-identical tests). Land improvements in core; the legacy copies
converge onto it per ROADMAP.md and should not receive new logic.

## Architecture

### Core Data Model

Strokes are arrays of points; a parallel `context` array records what each
stroke is recognized as. Unnamed strokes use placeholder `'art[n]'`.

```javascript
strokes = [[{x, y}, ...], ...]   // raw input (some demos add t, pressure)
context = ['circle', 'line']     // 1:1 with strokes
```

The library stores named items: user primitives (with fingerprints), and
compositions (with components + spatial graph). `basedOn` references make the
library hierarchical.

### Recognition Engine

> **Source of truth: `metamedium-core/src/recognition.ts` and
> `src/geometry.ts`, with `*.test.ts` beside them.** Exact thresholds are
> deliberately *not* restated here — they used to be, in ten documents, and
> they drifted. Read the code for values; read this for shape. The reasoning
> behind the rules is in `Assets/recognition-strategy.md`.

A stroke is reduced to a **fingerprint** — aspect ratio, straightness
(`directDistance / pathLength`, 1 = perfectly straight), closure, corner count
and angles, bounds, size — and detectors read that fingerprint.

Two properties matter more than any individual number:

**Multi-parse, not winner-take-all.** Every detector that qualifies contributes
a candidate; results are returned sorted by score, and nothing wins by
silencing the others (ARCHITECTURE-v6 principle 2). A closed, low-corner stroke
can be a circle *and* something else at once — the caller decides. Detectors
today: line, arc, triangle, rectangle, circle. Each result carries a grounded
`reasoning` string, which is what the "why" inspector surfaces.

**Detection keys on closure + corners + straightness together**, not on
straightness alone. Closure and corner count do most of the discriminating;
straightness mainly separates line from arc and vetoes circles.

**Size-relative closure** (key innovation): a stroke closes if the start–end
gap is under a fixed pixel threshold **or** under a fraction of the stroke's
size — small shapes need tight closure, large shapes tolerate bigger gaps. The
same size-relative logic guards overshoot detection, so short strokes don't all
read as circles. Both live in `isStrokeClosed` / `checkOvershoot`.

**Library matching** is a weighted fingerprint comparison (straightness,
aspect, corners, closure, size) with a straightness veto — see
`matchPrimitiveFromLibrary`.

### Spatial Graph

Relationships between strokes drive composition recognition: intersection,
touching (proximity threshold), containment (bounds inside closed shape),
directional proximity. Canonical: `metamedium-core/src/spatial.ts`. Legacy
copies for reference: `Web App Skeleton/src/core/spatial.ts` and the spatial
intelligence panel in `doodle2-canvas.html`.

### Tiered LLM Interpretation

> **Status (Aug 2026): Tiers 1–2 are live in the engine.** A model joins via
> `createAgentParticipant()` and proposes through the same channel a human uses.
> Design: `ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md`.
>
> **Multi-interpretation is a hard rule, not a nicety.** Models are asked for
> *several* readings, several models can answer in the same tier, and **all
> tiers show at once** — a confident Tier 2 reading never evicts Tier 0's. The
> old "escalate only on low confidence" policy is withdrawn: escalation means
> suppression, and disagreement between sources is exactly what the human wants
> to see. Read with `interpretationsOf()` / `byTier()` / `bySource()` /
> `disagreement()`; `topInterpretation()` is a headline helper, not the truth.

- **Tier 0:** engine heuristics (always available, offline) — **built**
- **Tier 1:** local model via Ollama (`localhost:11434/v1`) or LM Studio (`localhost:1234/v1`) — **built**
- **Tier 2:** hosted model via OpenRouter or Anthropic, bring-your-own-key — **built**
- **Tier 3:** structural proposals (growing what the board can know) — reserved

Tier is derived from the provider by `providerTier()` (localhost → 1, hosted →
2) and carried on the participant node via `join(kind, name, at, capability)`.

**Answers are nodes, not chat.** `session.answer()` places an explanation in the
canvas, anchored to the marks it is about and attributed to whoever said it.
Explanations are a **third plane** (`SessionState.explanations`) beside content
and gesture: visible and erasable, but not ink — they never join a lasso, a
cluster, or a signature. Several participants may answer the same question and
every answer is held.

**One transport covers Tier 1 and most of Tier 2:** Ollama, LM Studio, and
OpenRouter all speak the OpenAI-compatible `/v1/chat/completions` shape and
differ only by base URL and key. Anthropic needs its own client.

⚠️ `Web App Skeleton/src/llm/claudeInterpreter.ts` pins `claude-3-haiku-20240307`
and `claude-sonnet-4-20250514` — **both are past retirement and return 404**.
Retarget to `claude-opus-5` before trusting that file (thinking is on by
default there, so leave `max_tokens` headroom).

**The rules that make tiers safe:** LLMs receive structured geometric data
(fingerprints, spatial graph, library context) — **not screenshots**. Every
tier *proposes*; no tier commits — a model's output is an unblessed, attributed
edge that the human blesses or ignores. LLM calls must never block drawing;
degrade to Tier 0, never gate on a tier.

## Working with the Codebase

### metamedium-core (the engine — start here for recognition/engine work)

```bash
cd metamedium-core
npm install
npm test         # full suite incl. the canonical-loop scenario (keep green)
npm run typecheck
npm run build    # ESM + d.ts → dist/
npm run build:browser  # IIFE bundle; a copy is committed at Demos/metamedium-core.browser.js
```

After engine changes, rebuild the browser bundle and re-copy it to `Demos/`
(`Demos/session-engine.html` is the live reference surface) — CI fails if the
committed copy drifts from source.

`src/session/session.scenario.test.ts` is the executable spec for the
no-modes flow (lasso → check → summon → bless → artifact). Change it knowingly
or not at all. Design rationale: `ARCHITECTURE-v6-SESSION-ENGINE.md`.

### Standalone HTML demos

Self-contained single files (inline CSS + JS). Edit directly; test with
`python -m http.server 8000`. They are large — read selectively (search for
function names / UI strings) rather than loading whole files.

### Web App Skeleton (React/TypeScript)

```bash
cd "Web App Skeleton"
npm install
npm run dev      # development server
npm test         # vitest (geometry, recognition, spatial — keep green)
npm run lint     # 0 errors required; `any` warnings allowed until core extraction
npm run build    # typecheck + production build
```

Structure: `src/components/` (Canvas, SuggestionPanel, LibraryPanel, …),
`src/core/` (recognition, spatial, matching), `src/llm/` (heuristic + Claude
interpreters), `src/types/`, `src/test/` (synthetic stroke generators for
tests). Recognition changes must keep the vitest suite green — it encodes the
thresholds, which is why no document restates them.

### Experiments

See `EXPERIMENTS.md` for what each one is for. Two have real toolchains:

```bash
cd lens-canvas && npm run dev   # Vite on :5173; npm test → 19 vitest tests
cd v2-poc                       # esbuild; src/main.ts → bundle.js (committed)
```

`v2-poc/src/main.ts` was recovered and committed in August 2026 — an old
`.gitignore` rule had hidden it, leaving only the built `bundle.js`. Both are
in the repo now.

## Technical Specifications

**Performance targets:** drawing latency <16ms (60fps); heuristic recognition
<50ms per stroke; LLM tiers asynchronous and non-blocking.

**Data limits:** max 500 points/stroke, 50 strokes/composition, composition
depth 5, library 100 items.

**Browser support:** Chrome 100+, Safari 15+, Firefox 100+. Touch + mouse.
WebLLM features require WebGPU.

## Design System

Two palettes coexist **by intent** — the split is by brand, not drift. Don't
"fix" one to match the other.

| Surface | Palette | Type |
|---|---|---|
| Whitepaper, `Demos/`, flagship demos | `#0a0a0f` bg · `#e8e4d9` text · `#c9a84c` gold | Space Grotesk |
| `lens-canvas/`, `manim-explainer/`, `playground.html` | `#020a12` sea-deep · `#7dd8f7` cyan · `#d4af37` gold | JetBrains Mono |

The second is the personal-site (johnhanacek.com) language.

Recognition feedback (whitepaper/demos): accepted `#0066ff`, pending `#666666`,
high confidence green, medium confidence orange.

> 📌 **Pinned:** a deliberate MetaMedium style is still to be defined (John has
> one in mind). Until then treat the whitepaper palette as *current*, not
> *decided* — and keep the two systems separate.

## Development Philosophy

- **Ship something visible weekly** — no infrastructure-only weeks
- **Simple first** — build the simplest thing that works; refactor when patterns emerge
- **One core, many surfaces** — recognition logic belongs in `metamedium-core`; demos consume builds
- **Progressive enhancement** — heuristics always work offline; LLM tiers enhance, never gate
- **Experiments feed the platform** — they may fork and re-implement to move fast, but a proven idea lands in core with tests, and experiments never become the focus (`EXPERIMENTS.md`)
- **One definition, one home** — a threshold, a palette, or an inventory lives in exactly one place; everything else links to it
- **Keep CLAUDE.md current** — update it in the same PR as any structural change

## What to Preserve When Evolving

- Fingerprinting system and geometric utilities (expanded, not replaced)
- The `context` array (kept for compatibility as `components`/`basedOn` grow)
- Published URLs — retire old demos to `archive/` with redirects, never break links
- The whitepaper's claim-to-demo honesty: only link demos that actually show what the text claims

## Common Pitfalls

1. Don't fork the monolithic demos again — converge on the core (ROADMAP.md)
2. Don't let LLM calls block the drawing loop
3. Don't over-engineer ahead of a shippable demo (MoE/embeddings are deferred — see ROADMAP.md)
4. **Don't restate thresholds in prose.** They lived in ten documents and
   drifted; this file's own copy went stale twice. Cite
   `metamedium-core/src/*.ts` instead. The one intentional mirror is
   `skills/metamedium-code/skill.md`, which Claude Code loads standalone —
   re-verify it against the engine when recognition changes
5. The legacy monoliths (`doodle2-canvas.html`, `metadoodle1.html`,
   `Web App Skeleton/src/core/`) still carry their own diverged recognition
   copies. Read the file you're editing; land new logic in core

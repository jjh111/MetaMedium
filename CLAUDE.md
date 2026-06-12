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

**See `ROADMAP.md`** — the active plan (June 2026). Headline: ship Whitepaper
v5.1 (embed demos in the document), then Demo v3 (extract a shared
`metamedium-core` library and converge the forked demos onto it).

Architecture documents (planning, in chronological order):
- `PRD-v4-LLM-Grounded.md` — LLM-grounded architecture, tiered escalation (Tier 0 heuristics / Tier 1 light LLM / Tier 2 Claude), MCP server spec
- `ARCHITECTURE-v5-UNIFIED-ENGINE.md` — unified engine: shape experts, MoE routing, three state planes, `metamedium-core` extraction plan
- `metamedium-core-schema.md` — graph data model ("everything is a node; type emerges from connections")

## Repository Map

| Path | What it is |
|---|---|
| `index.html` | **Interactive whitepaper v5** "MetaMedium: AI Beyond Chat" (live on GitHub Pages) |
| `doodle2-canvas.html` | **Flagship demo**: heuristic recognition, spatial graph, library, undo/redo, touch. No LLM. Single-file (~500KB) |
| `metadoodle1.html` | Fork of flagship + tiered LLM recognition (WebLLM in-browser, LM Studio local API) + voice. Single-file (~600KB) |
| `v2-poc/` | Drawing-responsive text reflow PoC (chenglou/pretext). `index.html` + esbuild `bundle.js` |
| `Web App Skeleton/` | React + Vite + TypeScript + Zustand rebuild; Claude API interpreter skeleton in `src/llm/`; recognition/spatial/matching in `src/core/` |
| `Demos/` | Micro demos (fish, composition diagrams, no-modes graph, etc.) |
| `test-llm.html` | Standalone LLM test harness |
| `skills/` | Claude Code skills: `metamedium-code` (code patterns), `metamedium-design` (design principles) |
| `Assets/` | Figures, design notes, recognition strategy docs |
| `archive/` | Retired versions, incl. whitepaper v4 (root `MetaMedium_Whitepaper_v4.html` is a redirect stub — keep it) |
| `.github/workflows/ci.yml` | CI: lint + test + build of Web App Skeleton on every push/PR |

**Known duplication:** recognition logic exists independently in
`doodle2-canvas.html`, `metadoodle1.html`, `Web App Skeleton/src/core/`, and
`v2-poc/bundle.js`. Until `metamedium-core` is extracted (see ROADMAP.md), a
recognition change usually needs to be evaluated against all of them — prefer
landing improvements in `Web App Skeleton/src/core/` (the future core source)
and the flagship demo.

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

Geometric fingerprinting with heuristic detection:

```javascript
fingerprint = {
  aspectRatio: width / height,
  straightness: directDistance / pathLength,  // 1 = perfectly straight
  isClosed: startEndDistance < threshold,
  corners,                                     // corner count (later versions)
  bounds: { minX, maxX, minY, maxY },
  size: max(width, height)
}
```

**Straightness separates the primitives:**
- 0.0–0.4: circles (curved) — confidence 0.8
- 0.5–0.75: rectangles — confidence 0.7
- 0.75–1.0: lines — confidence 0.9

**Size-relative closure** (key innovation):
`isClosed = distance < 50px OR distance/size < 0.15` — small shapes need tight
closure, large shapes tolerate bigger gaps.

### Spatial Graph

Relationships between strokes drive composition recognition: intersection,
touching (proximity threshold), containment (bounds inside closed shape),
directional proximity. See `Web App Skeleton/src/core/spatial.ts` and the
spatial intelligence panel in `doodle2-canvas.html`.

### Tiered LLM Interpretation

- **Tier 0:** heuristics (always available, offline baseline)
- **Tier 1:** light/local LLM — WebLLM (WebGPU) or LM Studio in `metadoodle1.html`; Claude Haiku in `Web App Skeleton/src/llm/claudeInterpreter.ts`
- **Tier 2:** Claude Sonnet/Opus for compositions, ambiguity, and "explain why"

LLMs receive structured geometric data (fingerprints, spatial graph, library
context) — not screenshots. LLM calls must never block drawing; degrade
gracefully to Tier 0.

## Working with the Codebase

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
documented thresholds below.

### v2-poc

⚠️ The v2-poc **source was never committed** (an old `.gitignore` excluded
`v2-poc/src/`) — only the built `bundle.js` exists in the repo. Don't attempt
to rebuild it; treat `bundle.js` as the artifact until the source is recovered
and committed from the original machine.

## Technical Specifications

**Performance targets:** drawing latency <16ms (60fps); heuristic recognition
<50ms per stroke; LLM tiers asynchronous and non-blocking.

**Data limits:** max 500 points/stroke, 50 strokes/composition, composition
depth 5, library 100 items.

**Browser support:** Chrome 100+, Safari 15+, Firefox 100+. Touch + mouse.
WebLLM features require WebGPU.

## Design System

- Whitepaper/demos (current): dark theme, `#0a0a0f` background, `#e8e4d9` text, `#c9a84c` gold accent, Space Grotesk
- Recognition feedback: accepted `#0066ff`, pending `#666666`, high confidence green, medium confidence orange

## Development Philosophy

- **Ship something visible weekly** — no infrastructure-only weeks
- **Simple first** — build the simplest thing that works; refactor when patterns emerge
- **One core, many surfaces** — recognition logic belongs in shared code (post-extraction), demos consume builds
- **Progressive enhancement** — heuristics always work offline; LLM tiers enhance, never gate
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
4. Don't trust this file's thresholds blindly — the demos have diverged; verify in the file you're editing

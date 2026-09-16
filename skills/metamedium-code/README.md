# MetaMedium Code Patterns

Reusable code patterns from the MetaMedium engine, for building recognition
systems, gesture-based interfaces, and composable drawing applications.

> `skill.md` carries the engine's code **as shipped** (a few blocks are
> abridged, and say so) because Claude Code loads it standalone. Exact
> behaviour is defined by `metamedium-core/src/geometry.ts`,
> `src/recognition.ts` and `src/session/clean.ts`, with the tests beside them;
> those win any disagreement. Verified September 2026.

## Overview

The MetaMedium engine (`metamedium-core/`) implements a **stroke fingerprinting
and recognition system** that:
- Extracts geometric signatures from hand-drawn strokes, measured along the
  path and relative to the stroke's own size
- Returns every qualifying reading, scored from evidence and ranked
- Matches strokes against a library of named primitives
- Measures relations between marks as ratios with strength, and builds
  concepts and diagram roles on them
- Puts models in the loop through the same `propose` channel a human uses

## Pattern Categories

### 1. Core Types
| Type | Purpose |
|------|---------|
| `Point` | Coordinate `{ x, y, t? }` |
| `Bounds` | Bounding box `{ minX, maxX, minY, maxY }` |
| `Fingerprint` | Shape signature: straightness, closure, **extent**, corners (with arc-length position), start/end |
| `RecognitionResult` | A reading with confidence, a grounded `reasoning`, and optional `meta` |

### 2. Geometry Utilities
| Function | What It Does |
|----------|--------------|
| `getBounds()` | Bounding box from points |
| `denoise()` | Remove digitizer wobble; window sized in arc length |
| `calculateStraightness()` | Direct/path ratio on a denoised, simplified path |
| `isStrokeClosed()` | Size-relative closure; the fixed term is bounded by size |
| `checkOvershoot()` | Size-relative pass near the start |
| `shapeExtent()` | Fraction of its own box the outline encloses |
| `resampleByArcLength()` | Uniform samples, so index distance is arc length |
| `countCorners()` | Turn angles along the path, non-maximum suppression, seam scanned, windows bounded by the short side |
| `getFingerprint(points, scale)` | All of the above; `scale` is 1/zoom |

### 3. Detection Pattern
Each shape detector follows the **Evidence-Scored Pattern**:
- A hard gate for what it cannot be (closed, overshooting, absurd aspect)
- A weighted sum of continuous fits, capped by `MAX_TIER0_CONFIDENCE`
- Dropped below `MIN_CONFIDENCE`; otherwise returned with its `reasoning`
- **Multi-parse**: every qualifying detector contributes; results rank by
  measured confidence and nothing wins by silencing the others

The shape rung is closed at eight: `line`, `arc`, `triangle`, `rectangle`,
`circle`, `dot`, `text`, `arrow`. Below the hand's resolution only `dot` is
offered.

### 4. Clean Forms
| Function | What It Does |
|----------|--------------|
| `snapReading()` | Gate: top Tier 0 reading confident *and* leading the next by a margin |
| `idealize()` | The clean form, built from the ink's own measurements |

### 5. Relations
| Rule | Detection |
|------|-----------|
| Every threshold | A ratio of the marks' own size, judged against the smaller |
| Every relation | Carries `strength` 0–1 and a `reasoning` |
| `clusters()` | Connected components over engaging relations |

Kinds: `contains`/`inside`, `crossing`, `touching`, `near`, `above`/`below`/
`left-of`/`right-of`, `same-row`, `same-column`, `same-size`. See
`src/relate/relations.ts`.

### 6. Gestures
| Piece | How |
|-------|-----|
| Command mark | A signature learned from samples (`learnCommandMark`); the built-in check is one such signature |
| Engagement | Cross, overlap, or come close relative to the selection's own size |
| Erase | Count crossings with the target's outline |

### 7. Participants and Tiers
| Tier | Implementation | Shown |
|------|---------------|-------|
| 0 | Engine heuristics | Always, offline |
| 1 | Local model (Ollama, LM Studio) | Alongside Tier 0 |
| 2 | Hosted model (OpenRouter, Anthropic), bring-your-own-key | Alongside both |

Tier is derived from the provider (`providerTier`). `route()` reports when the
engine already has the answer and returns every candidate otherwise. All tiers
show at once; nothing commits.

### 8. State Management
- The session engine (`createSession`) is an event log over a node graph;
  marks gain reps and nothing is destroyed
- The Web App Skeleton's Zustand store is a legacy surface pattern; its
  recognition copy has diverged and should not receive new logic

## Key Insights

1. **Fingerprinting is the foundation** — all matching flows through numeric
   fingerprint comparison, and `extent` is the strongest single discriminator

2. **Measure along the path, relative to the stroke** — arc length, not point
   indices; fractions of size, not pixels. Fixed terms are bounded by size and
   scaled to the hand

3. **Confidence is measured, never assigned** — and capped below certainty,
   so a participant with more context can outrank the engine

4. **Confident AND unambiguous** before a mark is redrawn

5. **Veto checks** reject early (a straightness mismatch vetoes a library match)

6. **Routing, not escalation** — disagreement between sources is what the
   human wants to see

## File Structure

```
metamedium-core/src/
├── types.ts                 # Point, Bounds, Fingerprint, RecognitionResult
├── geometry.ts              # bounds, denoise, straightness, closure, corners, extent, fingerprint
├── recognition.ts           # the eight detectors, analyzeStroke, library matching
├── relate/relations.ts      # relations as ratios with strength; clusters
├── concepts/concept.ts      # row, column, frame, flow, grid, labelled
├── diagram/roles.ts         # container, node, edge, label, annotation, unclassified; genre
├── parse/                   # layout.ts (XY-cut → flexbox), graph.ts (nodes + SVG edges), scaffold.ts
├── session/
│   ├── session.ts           # createSession: the no-modes event log
│   ├── clean.ts             # snapReading, idealize
│   ├── commandmark.ts       # learnCommandMark, matchesCommandMark, BUILTIN_COMMAND_MARK
│   ├── gesture.ts           # lasso, engagement, whyNotResolved
│   ├── erase.ts             # scratchedOut by crossings
│   └── interpretations.ts   # interpretationsOf, byTier, disagreement
├── participants/            # agent.ts, bridge.ts, router.ts, serialize.ts
└── llm/provider.ts          # one OpenAI-compatible transport; providerTier
```

## Usage

This skill can be invoked when building:
- Sketch recognition systems
- Gesture-based UIs
- Composable drawing tools
- Any system that needs to match hand-drawn input

See `skill.md` for the code with inline documentation.

## Related Skills

- **metamedium-design**: Design principles for no-mode interfaces
- **CLAUDE.md**: Project context and development roadmap

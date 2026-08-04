# MetaMedium Code Patterns

A collection of reusable code patterns extracted from MetaMedium development sessions. These patterns are useful for building recognition systems, gesture-based interfaces, and composable drawing applications.

> Code shown here is **illustrative and abridged** (e.g. `detectCircle` omits
> the overshoot and aspect-ratio checks the engine actually runs). For patterns
> as-shipped read `skill.md`; for exact behaviour read
> `metamedium-core/src/recognition.ts`, which wins any disagreement.

## Overview

The MetaMedium codebase implements a **stroke fingerprinting and recognition system** that:
- Extracts geometric signatures from hand-drawn strokes
- Matches strokes against a library of primitives and compositions
- Builds spatial graphs to understand relationships between shapes
- Uses tiered interpretation (heuristics → fast LLM → full LLM)

## Pattern Categories

### 1. Core Types
| Type | Purpose |
|------|---------|
| `Point` | Basic coordinate `{ x, y }` |
| `Bounds` | Bounding box `{ minX, maxX, minY, maxY }` |
| `Fingerprint` | Shape signature (straightness, corners, closure, etc.) |
| `RecognitionResult` | Match result with confidence |

### 2. Geometry Utilities
| Function | What It Does |
|----------|--------------|
| `getBounds()` | Calculate bounding box from points |
| `calculateStraightness()` | Direct/path length ratio (0-1) |
| `isStrokeClosed()` | Size-relative closure check |
| `countCorners()` | Detect sharp turns in stroke |
| `convexHull()` | Graham scan for hull extraction |

### 3. Detection Pattern
Each shape detector follows the **Boolean Check Pattern**:
- Returns `null` if no match
- Returns `{ type, label, score, confidence }` if match
- Uses simple pass/fail checks, not complex scoring

```typescript
function detectCircle(fp: Fingerprint): RecognitionResult | null {
  const checks = {
    isClosed: fp.isClosed,
    fewCorners: fp.corners <= 1,
    notStraight: fp.straightness < 0.5,
  };

  if (checks.isClosed && checks.fewCorners && checks.notStraight) {
    return { type: 'circle', label: 'Circle', score: 80, confidence: 0.8 };
  }
  return null;
}
```

### 4. Spatial Relationships
| Relationship | Detection |
|--------------|-----------|
| `intersecting` | Bounds overlap |
| `touching` | Bounds within 50px |
| `containment` | One bounds fully inside another |

### 5. Tiered Interpretation
| Tier | Implementation | When Used |
|------|---------------|-----------|
| 0 | Heuristics | Always available (fast fallback) |
| 1 | Haiku | When API key configured |
| 2 | Sonnet | For complex shapes, auto-escalated |

### 6. State Management (Zustand)
- **Atomic updates**: All state changes happen in one `set()` call
- **Context array**: Maps 1:1 with strokes, stores shape labels
- **Library**: Stores primitives and compositions

## Key Insights

1. **Fingerprinting is the foundation** - All matching flows through numeric fingerprint comparison

2. **Size-relative thresholds** - Allow closure gap = 20% of shape size, so large shapes can have larger gaps

3. **Straightness ranges** create clear boundaries:
   - `> 0.75` = Lines
   - `0.5-0.75` = Rectangle edges
   - `< 0.4` = Circles

4. **Spatial clustering** groups nearby shapes before composition matching

5. **Veto checks** reject early (e.g., straightness diff > 0.5 = no match)

## File Structure

```
Web App Skeleton/src/
├── types/index.ts         # Core type definitions
├── utils/
│   ├── geometry.ts        # Bounds, straightness, corners
│   ├── intersections.ts   # Shape intersection detection
│   └── refinement.ts      # Stroke smoothing/simplification
├── core/
│   ├── recognition.ts     # Shape detection functions
│   ├── spatial.ts         # Spatial graph building
│   └── matching.ts        # Library fingerprint matching
├── llm/
│   ├── types.ts           # LLM-specific types
│   ├── heuristicInterpreter.ts  # Tier 0 fallback
│   ├── claudeInterpreter.ts     # Tier 1/2 API calls
│   └── interpreter.ts     # Orchestrator with escalation
├── store/useStore.ts      # Zustand state management
└── components/
    ├── Canvas.tsx         # Drawing surface
    └── SuggestionPanel.tsx # Recognition UI
```

## Usage

This skill can be invoked when building:
- Sketch recognition systems
- Gesture-based UIs
- Composable drawing tools
- Any system that needs to match hand-drawn input

See `skill.md` for full code examples with inline documentation.

## Related Skills

- **metamedium-design**: Design principles for no-mode interfaces
- **CLAUDE.md**: Project context and development roadmap

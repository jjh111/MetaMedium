# MetaMedium v5: Unified Engine Architecture

**Version:** 5.0 DRAFT
**Author:** Claude (Opus) + John Hanacek
**Date:** March 2026
**Status:** Planning Document

---

## Vision

MetaMedium aims to be a **recursively intelligent parsing system** — a grounded symbol emergence engine where marks become features become shapes become compositions become meaning, with each level able to recurse and specialize.

The engine should be:
- **Modular** — parse and pass, MoE-style routing between experts
- **Stateless at core** — pure functions, all state injected
- **Continuously learning** — library as embedding space, not discrete templates
- **Personally adaptive** — user fingerprint shapes recognition thresholds
- **Platform agnostic** — runs in browser, Node, with any renderer

---

## The Three State Planes

The engine separates three orthogonal concerns:

### 1. Parse State (ephemeral)
```typescript
interface ParseState {
  currentStroke: Point[];
  candidates: InterpretationCandidate[];
  routingDecisions: ExpertVote[];
  confidence: number;
}
```
Dies when interaction ends. Managed by the runtime, not the engine.

### 2. Library State (persistent, shareable)
```typescript
interface LibraryState {
  builtins: Record<string, LibraryItem>;     // circle, line, rect, triangle
  userPrimitives: Record<string, LibraryItem>; // user-defined shapes
  compositions: Record<string, CompositionItem>; // multi-stroke patterns
  embeddings: EmbeddingSpace;                  // continuous similarity space
}
```
Shareable between users/sessions. Export/import as JSON.

### 3. User Fingerprint State (persistent, personal)
```typescript
interface UserFingerprintState {
  calibration: CalibrationData;    // from onboarding
  ranges: FingerprintRanges;       // computed from calibration
  corrections: CorrectionHistory;  // learning from "meant something else"
  style: DrawingStyle;             // velocity, closure preference, etc.
}
```
Personal to one user. Shapes how the engine interprets their specific marks.

---

## The Recursive Parse Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  SEMANTIC LAYER                                                 │
│  "molecule" "flowchart" "equation" "map"                        │
│  ↑ composes from...                                             │
├─────────────────────────────────────────────────────────────────┤
│  DOMAIN EXPERTS (MoE routing)                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Math     │ │ Diagram  │ │ Notation │ │ User     │           │
│  │ Expert   │ │ Expert   │ │ Expert   │ │ Domains  │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └────────────┴────────────┴────────────┘                  │
│                        ↑ routes to...                           │
├─────────────────────────────────────────────────────────────────┤
│  COMPOSITION LAYER                                              │
│  spatial graph, containment, touching                           │
│  "arrow" = line + triangle (touching)                           │
│  ↑ assembles from...                                            │
├─────────────────────────────────────────────────────────────────┤
│  SHAPE EXPERTS (MoE routing)                                    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ Circle │ │ Line   │ │ Rect   │ │ Arc    │ │ User   │        │
│  │ Expert │ │ Expert │ │ Expert │ │ Expert │ │ Shapes │        │
│  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘        │
│      └──────────┴──────────┴──────────┴──────────┘              │
│                        ↑ votes from...                          │
├─────────────────────────────────────────────────────────────────┤
│  FEATURE LAYER (stateless, pure)                                │
│  fingerprint: { straightness, closure, corners, aspect,         │
│                 velocity, pressure, temporal }                  │
│  ↑ extracts from...                                             │
├─────────────────────────────────────────────────────────────────┤
│  STROKE LAYER (raw input)                                       │
│  [{x, y, t, pressure?}, ...]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Insight: Bidirectional Flow

Each layer doesn't just consume the layer below — it can provide **feedback**:
- Composition layer: "this looks like an arrow but triangle is malformed" → Shape layer: "be more forgiving on triangles attached to lines"
- Domain expert: "this is a math context" → Shape layer: "interpret ambiguous shapes as math symbols"

---

## MoE Routing: How Experts Vote

### Shape Expert Interface

```typescript
interface ShapeExpert {
  name: string;

  // Does this expert want to handle this stroke?
  shouldHandle(fingerprint: Fingerprint, context: ParseContext): number; // 0-1 weight

  // If selected, what's the interpretation?
  interpret(fingerprint: Fingerprint, context: ParseContext): ExpertResult;

  // Can be tuned by user fingerprint
  applyUserFingerprint?(userFp: UserFingerprintState): void;
}

interface ExpertResult {
  type: string;
  label: string;
  confidence: number;
  reasoning: string;
  suggestFeedback?: LayerFeedback;  // Optional feedback to other layers
}
```

### Built-in Experts (Tier 0 — Heuristic)

```typescript
// Circle Expert
const CircleExpert: ShapeExpert = {
  name: 'circle',
  shouldHandle: (fp) => {
    if (!fp.isClosed) return 0;
    if (fp.straightness > 0.5) return 0;
    if (fp.corners > 1) return 0.3;  // Might be polygon
    return 0.9;
  },
  interpret: (fp, ctx) => ({
    type: 'circle',
    label: 'Circle',
    confidence: calculateCircleConfidence(fp, ctx.userFingerprint),
    reasoning: 'Closed, curved, low corner count'
  })
};
```

### User-Defined Experts (from library)

When user saves a shape, it becomes an expert:

```typescript
function createUserShapeExpert(item: LibraryItem): ShapeExpert {
  return {
    name: item.label,
    shouldHandle: (fp) => {
      const similarity = matchFingerprint(fp, item.fingerprint);
      return similarity > 0.6 ? similarity : 0;
    },
    interpret: (fp, ctx) => ({
      type: item.type,
      label: item.label,
      confidence: matchFingerprint(fp, item.fingerprint),
      reasoning: `Matches saved "${item.label}" pattern`,
      isUserPrimitive: true
    })
  };
}
```

### The Router

```typescript
function routeToExperts(
  fingerprint: Fingerprint,
  experts: ShapeExpert[],
  context: ParseContext
): InterpretationCandidate[] {
  // 1. Get weights from all experts
  const votes = experts.map(expert => ({
    expert,
    weight: expert.shouldHandle(fingerprint, context)
  })).filter(v => v.weight > 0);

  // 2. Sort by weight
  votes.sort((a, b) => b.weight - a.weight);

  // 3. Top-k experts interpret
  const topK = votes.slice(0, 3);
  const candidates = topK.map(v => v.expert.interpret(fingerprint, context));

  // 4. Return ranked by confidence
  return candidates.sort((a, b) => b.confidence - a.confidence);
}
```

---

## The Continuous Library

### From Discrete Templates to Embedding Space

Current approach (discrete):
```typescript
library['circle'] = { fingerprint: {...} }
library['my-fish'] = { fingerprint: {...} }
// Match: exact fingerprint comparison
```

v5 approach (continuous):
```typescript
interface EmbeddingSpace {
  // Each library item lives in a continuous space
  items: Map<string, EmbeddedItem>;

  // Find k-nearest neighbors
  nearest(fingerprint: Fingerprint, k: number): NearestResult[];

  // Get topology info
  getDensity(fingerprint: Fingerprint): number;  // Is this well-trodden territory?
  getAmbiguity(fingerprint: Fingerprint): number; // Is this between multiple items?
}

interface NearestResult {
  item: LibraryItem;
  distance: number;
  confidence: number;
}
```

### Embedding Computation

The fingerprint IS the embedding (initially). For v5:

```typescript
function fingerprintToEmbedding(fp: Fingerprint): number[] {
  return [
    fp.straightness,
    Math.min(fp.aspectRatio, 1/fp.aspectRatio),  // Normalize to 0-1
    fp.isClosed ? 1 : 0,
    Math.min(fp.corners / 6, 1),  // Normalize corner count
    Math.min(fp.closureDistance / fp.size, 1),  // Relative closure
  ];
}
```

Later, this could be learned (small neural net) or LLM-derived.

### Density-Aware Recognition

```typescript
function interpretWithDensity(
  fp: Fingerprint,
  space: EmbeddingSpace
): InterpretationResult {
  const neighbors = space.nearest(fp, 5);
  const density = space.getDensity(fp);
  const ambiguity = space.getAmbiguity(fp);

  if (density < 0.3) {
    // Unexplored territory — ask user
    return {
      candidates: [],
      needsUserInput: true,
      reason: 'This doesn\'t match anything I know. What is it?'
    };
  }

  if (ambiguity > 0.7) {
    // Between multiple things — offer choices
    return {
      candidates: neighbors.slice(0, 3).map(n => ({
        type: n.item.type,
        label: n.item.label,
        confidence: 1 - n.distance
      })),
      needsUserInput: true,
      reason: `This could be ${neighbors[0].item.label} or ${neighbors[1].item.label}`
    };
  }

  // Clear match
  return {
    candidates: [{
      type: neighbors[0].item.type,
      label: neighbors[0].item.label,
      confidence: 1 - neighbors[0].distance
    }],
    needsUserInput: false
  };
}
```

---

## Tiered Escalation (from PRD v4)

The existing tiered architecture fits into this model:

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 2: Full LLM (Claude Sonnet/Opus)                      │
│  - Novel compositions                                        │
│  - Explaining reasoning                                      │
│  - Teaching new patterns                                     │
│  - Ambiguity that heuristics can't resolve                  │
├─────────────────────────────────────────────────────────────┤
│  TIER 1: Light LLM (Claude Haiku / local)                   │
│  - Composition matching                                      │
│  - Gesture detection                                         │
│  - Moderate ambiguity                                        │
├─────────────────────────────────────────────────────────────┤
│  TIER 0: Heuristics (Shape Experts)                         │
│  - Primitive recognition                                     │
│  - High-confidence matches                                   │
│  - Offline baseline                                          │
└─────────────────────────────────────────────────────────────┘
```

Escalation is **one form of routing**. The MoE router can decide:
- "Shape experts are confident" → no escalation
- "Composition detected but ambiguous" → Tier 1
- "Novel pattern, needs explanation" → Tier 2
- "User asked 'why did you think that?'" → Tier 2

---

## Module Structure: `metamedium-core`

```
metamedium-core/
├── src/
│   ├── index.ts              # Public API
│   │
│   ├── geometry/
│   │   ├── points.ts         # Point operations
│   │   ├── bounds.ts         # Bounding box operations
│   │   ├── distance.ts       # Distance calculations
│   │   └── index.ts
│   │
│   ├── fingerprint/
│   │   ├── extract.ts        # getFingerprint()
│   │   ├── corners.ts        # Corner detection
│   │   ├── straightness.ts   # Straightness calculation
│   │   ├── closure.ts        # Closure detection
│   │   └── index.ts
│   │
│   ├── experts/
│   │   ├── interface.ts      # ShapeExpert interface
│   │   ├── circle.ts         # Circle expert
│   │   ├── line.ts           # Line expert
│   │   ├── rectangle.ts      # Rectangle expert
│   │   ├── arc.ts            # Arc expert
│   │   ├── polygon.ts        # Polygon expert
│   │   ├── user.ts           # User-defined shape expert factory
│   │   └── index.ts
│   │
│   ├── router/
│   │   ├── moe.ts            # MoE routing logic
│   │   ├── escalation.ts     # Tier escalation rules
│   │   └── index.ts
│   │
│   ├── library/
│   │   ├── storage.ts        # LibraryItem CRUD
│   │   ├── embedding.ts      # EmbeddingSpace
│   │   ├── matching.ts       # Template matching
│   │   └── index.ts
│   │
│   ├── spatial/
│   │   ├── graph.ts          # SpatialGraph
│   │   ├── intersection.ts   # Intersection detection
│   │   ├── containment.ts    # Containment detection
│   │   ├── proximity.ts      # Proximity relationships
│   │   └── index.ts
│   │
│   ├── composition/
│   │   ├── detect.ts         # Composition detection
│   │   ├── fingerprint.ts    # Composition fingerprinting
│   │   ├── matching.ts       # Composition matching
│   │   └── index.ts
│   │
│   └── types/
│       ├── geometry.ts
│       ├── fingerprint.ts
│       ├── expert.ts
│       ├── library.ts
│       ├── spatial.ts
│       └── index.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

### Public API Surface

```typescript
// metamedium-core/src/index.ts

// Geometry
export { Point, Bounds, getBounds, distance } from './geometry';

// Fingerprinting
export { Fingerprint, getFingerprint } from './fingerprint';

// Recognition
export {
  ShapeExpert,
  routeToExperts,
  CircleExpert,
  LineExpert,
  RectangleExpert,
  ArcExpert,
  createUserShapeExpert
} from './experts';

// Library
export {
  Library,
  LibraryItem,
  EmbeddingSpace,
  createLibrary,
  matchAgainstLibrary
} from './library';

// Spatial
export {
  SpatialGraph,
  buildSpatialGraph,
  checkIntersection,
  checkContainment
} from './spatial';

// Composition
export {
  detectCompositions,
  CompositionFingerprint,
  matchComposition
} from './composition';

// Types
export * from './types';
```

---

## Integration Points

### With Web App Skeleton (React)

```typescript
// Web App Skeleton uses metamedium-core
import {
  getFingerprint,
  routeToExperts,
  buildSpatialGraph,
  createUserShapeExpert
} from 'metamedium-core';

// The LLM layer (src/llm/) calls into core for geometric analysis
// The UI layer (src/components/) calls core for recognition
// The store manages state, core provides pure functions
```

### With Standalone Demos (vanilla JS)

```typescript
// Build a UMD bundle for browser
// <script src="metamedium-core.umd.js"></script>

const { getFingerprint, routeToExperts } = MetaMediumCore;

canvas.addEventListener('pointerup', () => {
  const fp = getFingerprint(currentStroke);
  const candidates = routeToExperts(fp, builtinExperts, context);
  showSuggestions(candidates);
});
```

### With WebGPU Renderer (metadoodle1)

```typescript
// Core doesn't care about rendering
import { getFingerprint, routeToExperts } from 'metamedium-core';

// WebGPU handles rendering
const renderer = new WebGPURenderer(canvas);

// Same recognition logic
const fp = getFingerprint(stroke);
const candidates = routeToExperts(fp, experts, context);
```

### With MCP Server

```typescript
// MCP server wraps core functions as tools
import {
  getFingerprint,
  routeToExperts,
  matchAgainstLibrary,
  buildSpatialGraph
} from 'metamedium-core';

server.addTool('interpret_stroke', async (params) => {
  const stroke = params.stroke;
  const fp = getFingerprint(stroke.points);
  const candidates = routeToExperts(fp, getExperts(), {
    library: getLibrary(),
    userFingerprint: getUserFingerprint()
  });
  return { candidates };
});
```

---

## Migration Path

### Phase 1: Extract Core (Week 1)
1. Create `metamedium-core/` directory in repo
2. Copy geometry, recognition, matching, spatial from Web App Skeleton
3. Refactor to remove React/Zustand dependencies
4. Add build step (tsc + Vite library mode)
5. Verify all existing tests pass

### Phase 2: Wire Up Web App Skeleton (Week 1-2)
1. Update Web App Skeleton to import from `metamedium-core`
2. Remove duplicate code
3. Ensure LLM layer still works

### Phase 3: Add Expert System (Week 2)
1. Implement ShapeExpert interface
2. Convert existing heuristics to experts
3. Add MoE router
4. Add user-defined expert factory

### Phase 4: Continuous Library (Week 3)
1. Implement EmbeddingSpace
2. Add density/ambiguity calculations
3. Update matching to use embedding distance
4. Test with real user data

### Phase 5: Retrofit Demos (Week 3-4)
1. Build UMD bundle
2. Update doodle2-canvas.html to use core
3. Update fish demo to use core
4. Create new structured demo using core

### Phase 6: MCP Integration (Week 4-5)
1. Create MCP server package
2. Expose core functions as tools
3. Test with Claude Desktop
4. Document MCP API

---

## Success Criteria

### Engine Quality
- [ ] Core library has zero framework dependencies
- [ ] All geometric functions are pure and tested
- [ ] Expert system correctly routes to appropriate handlers
- [ ] Continuous library finds reasonable neighbors
- [ ] User fingerprint measurably improves recognition

### Integration Quality
- [ ] Web App Skeleton works with extracted core
- [ ] Standalone demos work with UMD bundle
- [ ] MCP server exposes full functionality
- [ ] WebGPU renderer can use same recognition

### User Experience
- [ ] Recognition feels more accurate than v4
- [ ] System explains its reasoning when asked
- [ ] User corrections improve future recognition
- [ ] Onboarding captures useful fingerprint data

---

## Open Questions

1. **How much should the LLM influence routing?**
   - Option A: LLM is just another expert (can be outvoted)
   - Option B: LLM is the router (decides which experts to consult)
   - Option C: Hybrid (heuristics route, LLM resolves ties)

2. **How to learn from corrections?**
   - Option A: Store corrections as additional examples
   - Option B: Adjust expert weights based on corrections
   - Option C: Fine-tune embedding space
   - Option D: All of the above, depending on correction type

3. **How to handle compositions with shared components?**
   - "arrow" uses triangle, "house" uses triangle
   - When user draws triangle, which composition context matters?

4. **How to version the library format?**
   - User exports library in v5, imports in v6?
   - Migration functions? Schema versioning?

---

## References

- PRD-v4-LLM-Grounded.md — Previous architecture document
- CLAUDE.md — Project development guide
- metamedium-core-schema.md — Graph-based data model
- Web App Skeleton/src/llm/ — Existing tiered interpreter

---

**This is the magnum opus architecture. The engine that grounds marks to meaning, learns from use, and adapts to each user's hand.**

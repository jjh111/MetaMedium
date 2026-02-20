# METAMEDIUM v4 - LLM-GROUNDED DRAWING SYSTEM

**Version:** 4.0 DRAFT
**Approach:** Collaborative Grounding (not "harness")
**Date:** February 2026
**Base:** Web App Skeleton (React + Vite + TypeScript + Zustand)

---

## CORE PHILOSOPHY SHIFT

### From Harness to Collaborative Grounding

**Old approach (v3):** We build recognition heuristics. The system does pattern matching. LLMs are optional "assistants."

**New approach (v4):** LLMs handle interpretation. MetaMedium provides the **semantic substrate** that makes interpretation meaningful, composable, and queryable. The system becomes more powerful *because* of the grounding, not despite it.

### The MetaMedium Secret Sauce

1. **Composable Library** - Named shapes, compositions, hierarchies, `basedOn` references
2. **Mathematical Grounding** - Precise geometry, bounds, fingerprints, spatial relationships
3. **Semantic Graph** - Typed relationships (touching, intersecting, contains), queryable structure
4. **Personal Fingerprints** - User-specific drawing style captured through onboarding

The LLM interprets "what am I drawing?" but MetaMedium provides:
- The vocabulary of named shapes
- The precise geometry to reason about
- The relationships between elements
- The personal drawing patterns to match against

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER DRAWS                                │
│                     (strokes on canvas)                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GROUNDING LAYER (MetaMedium Core)             │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Strokes   │  │ Fingerprint │  │   Spatial   │              │
│  │   + Bounds  │  │   Database  │  │    Graph    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  COMPOSABLE LIBRARY                      │    │
│  │  • User primitives (bubble, arrow, etc.)                │    │
│  │  • Compositions (molecule = 3 bubbles + 2 lines)        │    │
│  │  • basedOn references (bubble → circle)                 │    │
│  │  • Personal fingerprints from onboarding                │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MCP SERVER                               │
│                                                                  │
│  Resources:                    Tools:                            │
│  • canvas://state              • interpret_stroke                │
│  • library://items             • accept_interpretation           │
│  • fingerprints://user         • save_to_library                 │
│  • spatial://graph             • select_region                   │
│                                • query_semantic                  │
│                                • get_fingerprint_match           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │   TIER 0      │   │   TIER 1      │   │   TIER 2      │
    │  In-Browser   │   │  Light API    │   │  Full API     │
    │   (WebLLM)    │   │  (Haiku)      │   │ (Claude/GPT)  │
    │               │   │               │   │               │
    │ Offline base  │   │ Fast, cheap   │   │ Complex tasks │
    │ Primitives    │   │ Compositions  │   │ Teaching      │
    │ Quick match   │   │ Gestures      │   │ Ambiguity     │
    └───────────────┘   └───────────────┘   └───────────────┘
```

---

## TIERED LLM ARCHITECTURE

### Tier 0: In-Browser (Offline Baseline)

**Model Options:**
- Default: Best quality/size tradeoff (e.g., Llama 3.2 3B, Phi-3 Mini)
- User choice: "Bring your own local model" feature
- Smallest viable: For low-memory devices

**Implementation:** WebLLM (WebGPU) or llama.cpp WASM (WebAssembly)

**Purpose:** Offline fallback, instant primitive recognition

**When used:**
- No network connection
- Basic primitive matching (circle, line, rectangle, triangle)
- High-confidence fingerprint matches

**Capabilities:**
- Compare stroke fingerprint to user's saved fingerprints
- Simple classification based on geometric features
- "This matches your 'bubble' with 92% similarity"

**Model Selection UI:**
```
┌─────────────────────────────────────────┐
│  Local Model Settings                   │
├─────────────────────────────────────────┤
│  ○ Recommended (Llama 3.2 3B, ~1.8GB)   │
│  ○ Lightweight (Phi-3 Mini, ~800MB)     │
│  ○ Custom model URL: [____________]     │
│                                         │
│  Status: Downloaded ✓                   │
│  [Re-download] [Clear cache]            │
└─────────────────────────────────────────┘
```

**Optimization Strategy:**
1. Start with quality all-rounder for PoC
2. Test interpretation quality across models
3. Find minimum viable model for core use case
4. Make model selection a user feature

### Tier 1: Light API (Fast + Cheap)

**Model:** Claude Haiku or equivalent
**Purpose:** Quick interpretation, gesture detection, composition matching
**When used:**
- Selection gesture detection
- Multi-stroke composition recognition
- Moderate ambiguity resolution

**Capabilities:**
- "User drew a lasso around 3 shapes - this is a selection gesture"
- "These 5 strokes together match the saved 'molecule' composition"
- "This could be a star (70%) or a burst (60%)"

### Tier 2: Full API (Complex Reasoning)

**Model:** Claude Sonnet/Opus, GPT-4
**Purpose:** Teaching, complex disambiguation, novel compositions
**When used:**
- Onboarding (understanding user's drawing style)
- New composition recognition
- Explaining why something was recognized
- Suggesting compositions user might want to save

**Capabilities:**
- "Based on your 5 circle examples, you tend to draw clockwise with slight overshoot"
- "This looks like a new pattern - 2 triangles connected at tips. Save as 'bowtie'?"
- "The reason I think this is an arrow: line shaft + triangular head pointing right"

---

## ONBOARDING FLOW

### Philosophy: "The Quick Brown Fox" of Drawing

Just as voice systems use "The quick brown fox jumps over the lazy dog" to capture full phonetic range, we need a drawing sequence that exercises the full range of user gestures:

- Fast vs slow strokes
- Large vs small shapes
- Closed vs open forms
- Sharp corners vs smooth curves
- Single stroke vs multi-stroke
- Precise vs loose/sketchy

### Calibration Sequence

**Goal:** Capture user's drawing style across edge cases in ~3 minutes

**Flow:**
```
1. Welcome: "Let's learn how YOU draw"

2. CALIBRATION SEQUENCE (not just primitives):

   a. "Draw a quick circle" (fast, closed, curved)
   b. "Draw a careful circle" (slow, precise)
   c. "Draw a straight line across" (fast, open, straight)
   d. "Draw a short careful line" (slow, precise)
   e. "Draw a rectangle" (closed, corners)
   f. "Draw a triangle" (closed, sharp corners)
   g. "Draw a squiggle/scribble" (captures loose style)
   h. "Draw a spiral" (continuous curve, tests overshoot)
   i. "Draw a star in one stroke" (complex, multi-corner)
   j. "Draw an X" (crossing lines)

3. GESTURE CALIBRATION (final step):
   "Draw your selection gesture: circle with a checkmark"
   - User draws the gesture 3 times
   - System captures the gesture fingerprint

4. Completion: Profile saved, exportable
```

**Data Captured:**
```typescript
interface UserProfile {
  id: string;
  name: string;
  createdAt: number;
  version: number;

  // Calibration data
  calibration: {
    fastCircle: Fingerprint;
    carefulCircle: Fingerprint;
    fastLine: Fingerprint;
    carefulLine: Fingerprint;
    rectangle: Fingerprint;
    triangle: Fingerprint;
    squiggle: Fingerprint;
    spiral: Fingerprint;
    star: Fingerprint;
    crossingLines: Fingerprint;
  };

  // Derived ranges (computed from calibration)
  ranges: {
    circle: FingerprintRange;
    line: FingerprintRange;
    rectangle: FingerprintRange;
    triangle: FingerprintRange;
  };

  // Selection gesture
  selectionGesture: {
    examples: Fingerprint[];  // 3 examples
    averageFingerprint: Fingerprint;
  };

  // Drawing style metrics
  style: {
    averageVelocity: number;
    velocityVariance: number;
    prefersClosed: boolean;
    typicalSize: { small: number; medium: number; large: number };
  };
}
```

### Profile Management

- **Export:** `profile.json` file, shareable
- **Import:** Load another user's profile
- **Inline refinement:** "Meant something else" on any recognition
- **Redo onboarding:** Accessible from settings
- **Multiplayer ready:** Profiles identify drawing style per user

**Data Captured:**
```typescript
interface UserFingerprints {
  circle: FingerprintRange;
  line: FingerprintRange;
  rectangle: FingerprintRange;
  triangle: FingerprintRange;
  createdAt: number;
  version: number;
}

interface FingerprintRange {
  examples: Fingerprint[];  // The 5 raw examples
  ranges: {
    straightness: { min: number; max: number; mean: number };
    aspectRatio: { min: number; max: number; mean: number };
    closureDistance: { min: number; max: number; mean: number };
    size: { min: number; max: number; mean: number };
  };
  averageVelocity: number;
  averagePointCount: number;
}
```

---

## SELECTION GESTURE SYSTEM

### No-Mode Selection: Circle + Check

**Concept:** Single gesture combines selection and confirmation - a circle with a checkmark tail.

```
    ╭───────╮
   ╱         ╲
  │           │
   ╲         ╱
    ╰───────╯
              ╲
               ╲
                ✓
```

### Detection Strategy

**The gesture is a single stroke:**
1. Starts as encircling motion (the lasso/circle part)
2. Ends with a checkmark/tick flourish
3. If it intersects or is very close to the last drawn containing loop → triggers selection

**Key insight:** The checkmark "tail" distinguishes this from just drawing a circle. It's learnable, quick, and unmistakable.

### Detection Logic

```typescript
interface SelectionGestureResult {
  isSelectionGesture: boolean;
  confidence: number;
  enclosedBounds: Bounds | null;
  enclosedShapeIndices: number[];
}

function detectSelectionGesture(
  stroke: Point[],
  userGestureFingerprint: Fingerprint,  // From onboarding
  existingStrokes: Point[][],
  shapes: Shape[]
): SelectionGestureResult {

  // 1. Check if stroke matches user's trained selection gesture
  const gestureMatch = compareFingerprints(
    getFingerprint(stroke),
    userGestureFingerprint
  );

  if (gestureMatch < 0.6) {
    return { isSelectionGesture: false, confidence: 0, enclosedBounds: null, enclosedShapeIndices: [] };
  }

  // 2. Analyze stroke structure: circle-ish start + checkmark end
  const hasCircularStart = analyzeCircularPortion(stroke.slice(0, Math.floor(stroke.length * 0.7)));
  const hasCheckmarkEnd = analyzeCheckmarkPortion(stroke.slice(Math.floor(stroke.length * 0.7)));

  if (!hasCircularStart || !hasCheckmarkEnd) {
    return { isSelectionGesture: false, confidence: 0, enclosedBounds: null, enclosedShapeIndices: [] };
  }

  // 3. Find enclosed shapes
  const circularPortion = stroke.slice(0, Math.floor(stroke.length * 0.7));
  const enclosedBounds = getBounds(circularPortion);
  const enclosedIndices = findEnclosedShapes(enclosedBounds, shapes);

  // 4. Check proximity to last containing loop (if any recent lasso-like stroke)
  // This handles the case where gesture is drawn near/intersecting previous selection

  return {
    isSelectionGesture: true,
    confidence: gestureMatch,
    enclosedBounds,
    enclosedShapeIndices: enclosedIndices
  };
}
```

### Selection Activated

When gesture is detected:
1. Enclosed shapes become selected (visual highlight)
2. **Contextual suggestions appear** based on what's selected:
   - Single shape: "Rename", "Delete", "Duplicate"
   - Multiple shapes: "Save as composition", "Group", "Align"
   - Shapes with relationships: "Save [shape] + [shape] as..."
3. Context menu is inline, not modal

### Hardcoded Fallback (for PoC)

Until onboarding captures user's gesture, use heuristic:
```typescript
function detectSelectionGestureHardcoded(stroke: Point[]): boolean {
  const fp = getFingerprint(stroke);

  // Circle-ish with tail
  const circularPart = stroke.slice(0, Math.floor(stroke.length * 0.75));
  const tailPart = stroke.slice(Math.floor(stroke.length * 0.75));

  const circularFp = getFingerprint(circularPart);
  const isCircular = circularFp.isClosed || circularFp.closureDistance < 50;
  const isNotStraight = circularFp.straightness < 0.5;

  // Tail should be relatively straight (the check mark)
  const tailFp = getFingerprint(tailPart);
  const hasTail = tailFp.straightness > 0.4 && tailPart.length > 5;

  return isCircular && isNotStraight && hasTail;
}
```

---

## MCP SERVER SPECIFICATION

### Resources

```typescript
// Canvas state - current drawing
"canvas://state" → {
  strokes: Point[][],
  strokeIds: string[],
  context: string[],  // What each stroke is recognized as
  shapes: Shape[],    // Geometric definitions
  spatialGraph: SpatialGraph,
  bounds: Bounds      // Canvas bounds
}

// Library - saved shapes and compositions
"library://items" → {
  [key: string]: LibraryItem
}

// User fingerprints - personal drawing patterns
"fingerprints://user" → UserFingerprints

// Spatial relationships
"spatial://graph" → {
  connections: SpatialConnection[],
  containment: SpatialContainment[],
  proximity: ProximityRelation[]
}
```

### Tools

```typescript
// Interpret a stroke - returns possible matches
interpret_stroke(strokeIndex: number) → {
  candidates: Array<{
    type: string,
    label: string,
    confidence: number,
    reasoning: string
  }>
}

// Accept an interpretation
accept_interpretation(strokeIndex: number, type: string) → void

// Save current selection to library
save_to_library(name: string, strokeIndices: number[]) → {
  key: string,
  item: LibraryItem
}

// Select a region
select_region(bounds: Bounds) → {
  selectedIndices: number[],
  selectedTypes: string[]
}

// Semantic query
query_semantic(query: string) → {
  result: any,
  explanation: string
}

// Match fingerprint against user's saved patterns
get_fingerprint_match(strokeIndex: number) → {
  matches: Array<{
    type: string,
    similarity: number,
    fingerprintComparison: object
  }>
}

// Get interpretation reasoning
explain_interpretation(strokeIndex: number, type: string) → {
  reasoning: string,
  confidenceFactors: object
}
```

---

## DEVELOPMENT PHASES

### Priority: PoC First

Before building onboarding or refined UI, we need to validate the core architecture works:
1. Can we connect LLMs to canvas state?
2. Can LLMs interpret strokes?
3. Can we call LLM tools to accept/save?

Hard-code gesture detection initially. Add onboarding polish later.

---

### Phase 0: Infrastructure + PoC (Week 1) ⭐ START HERE

**Goal:** Validate LLM integration path works end-to-end

**Tasks:**
- [ ] Clean up Web App Skeleton dependencies
- [ ] Add MCP SDK dependencies
- [ ] Create minimal MCP server (can be same process or separate)
- [ ] Expose canvas state as MCP resource
- [ ] Create `interpret_stroke` tool
- [ ] Test with Claude API directly (before MCP client)
- [ ] Hardcode selection gesture detection (circle + check heuristic)
- [ ] Add basic "bring your own API key" input

**PoC Success Criteria:**
- [ ] Draw a stroke
- [ ] Claude API receives stroke data + library context
- [ ] Claude returns interpretation
- [ ] Interpretation appears in UI
- [ ] Can accept interpretation

**Deliverable:** Proof that LLM-grounded recognition works

---

### Phase 1: MCP Server Complete (Week 1-2)

**Goal:** Full MCP server with all resources and tools

**Tasks:**
- [ ] Implement all resource handlers:
  - `canvas://state`
  - `library://items`
  - `fingerprints://user` (placeholder for now)
  - `spatial://graph`
- [ ] Implement all tool handlers:
  - `interpret_stroke`
  - `accept_interpretation`
  - `save_to_library`
  - `select_region`
  - `query_semantic`
- [ ] WebSocket bridge from React app ↔ MCP server
- [ ] Test with Claude Desktop MCP integration

**Deliverable:** Full MCP server, testable with any MCP client

---

### Phase 2: In-Browser LLM (Tier 0) (Week 2-3)

**Goal:** Offline baseline working

**Tasks:**
- [ ] Evaluate WebLLM models for size/quality tradeoff
- [ ] Create "bring your own local model" feature
- [ ] Integrate WebLLM with model selection
- [ ] Create streamlined interpretation prompt
- [ ] Build loading/progress UI for model download
- [ ] Implement caching for model weights
- [ ] Fallback to heuristics while model loads

**Deliverable:** Works offline with in-browser LLM

---

### Phase 3: API Tiers (Tier 1 + 2) (Week 3)

**Goal:** Tiered escalation working

**Tasks:**
- [ ] API key management (localStorage, encrypted)
- [ ] Tier 1 (Haiku): Fast interpretation
- [ ] Tier 2 (Sonnet/Opus): Complex reasoning
- [ ] Auto-escalation logic:
  - Tier 0 → Tier 1 if confidence < threshold
  - Tier 1 → Tier 2 for compositions or ambiguity
- [ ] "Explain this" feature (Tier 2)

**Deliverable:** Full tiered system, auto-escalation

---

### Phase 4: Selection Gesture + Context (Week 3-4)

**Goal:** No-mode selection fully working

**Tasks:**
- [ ] Refine circle+check detection (improve heuristics)
- [ ] Add user gesture training (part of onboarding)
- [ ] Build selection state management
- [ ] Create inline contextual suggestions
- [ ] Wire up actions from selection context
- [ ] "Meant something else" inline refinement

**Deliverable:** Selection gesture works reliably

---

### Phase 5: Onboarding + Profiles (Week 4)

**Goal:** Full calibration sequence, exportable profiles

**Tasks:**
- [ ] Build calibration UI (the 10 strokes + gesture)
- [ ] Derive fingerprint ranges from calibration
- [ ] Profile export/import (JSON)
- [ ] Profile switching UI
- [ ] Store profiles in localStorage
- [ ] Use calibration data in recognition prompts

**Deliverable:** Onboarding complete, profiles work

---

### Phase 6: UI Refinement (Week 5)

**Goal:** Contextual inline UI, not floating panels

**Tasks:**
- [ ] Replace floating recognition panel → inline near stroke
- [ ] Contextual action menus based on selection
- [ ] Gesture hints and feedback animations
- [ ] Progressive disclosure of complexity
- [ ] Mobile/touch optimization

**Deliverable:** Polished, native-feeling UI

---

### Phase 7: Polish + Demo (Week 5-6)

**Goal:** Demo-ready

**Tasks:**
- [ ] Create demo scenarios
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation
- [ ] Demo videos

**Deliverable:** MetaMedium v4 demo

---

## PROMPT ENGINEERING

### Stroke Interpretation Prompt (Tier 0/1)

```
You are interpreting a hand-drawn stroke. You have access to:

1. STROKE DATA:
   - Points: {{pointCount}} points
   - Fingerprint: straightness={{straightness}}, aspectRatio={{aspectRatio}},
     corners={{corners}}, isClosed={{isClosed}}
   - Bounds: {{bounds}}

2. USER'S DRAWING PATTERNS (from onboarding):
   {{#each userFingerprints}}
   - {{type}}: straightness {{ranges.straightness.min}}-{{ranges.straightness.max}},
     aspectRatio {{ranges.aspectRatio.min}}-{{ranges.aspectRatio.max}}
   {{/each}}

3. LIBRARY (user's saved shapes):
   {{#each libraryItems}}
   - "{{label}}" ({{type}}): {{description}}
   {{/each}}

4. CANVAS CONTEXT:
   - Existing shapes: {{existingShapes}}
   - Spatial relationships: {{spatialGraph}}

Return JSON with your interpretation:
{
  "candidates": [
    {
      "type": "circle",
      "label": "Circle",
      "confidence": 0.85,
      "reasoning": "Closed shape with low straightness, matches user's circle pattern"
    }
  ],
  "isSelectionGesture": false,
  "selectionDetails": null
}
```

### Selection Gesture Prompt (Tier 1)

```
Determine if this stroke is a selection gesture (lasso to select shapes).

STROKE PROPERTIES:
- Closed: {{isClosed}}
- Straightness: {{straightness}}
- Drawing duration: {{duration}}ms
- Points per second: {{pointsPerSecond}}

SHAPES INSIDE STROKE BOUNDS:
{{#each enclosedShapes}}
- {{type}} at {{bounds}}
{{/each}}

A selection gesture typically:
1. Forms a rough closed loop
2. Is drawn quickly (>50 points/sec)
3. Encloses existing shapes
4. Doesn't match any saved pattern well

Return JSON:
{
  "isSelectionGesture": true/false,
  "confidence": 0.0-1.0,
  "selectedShapeIndices": [0, 2, 3],
  "reasoning": "Quick enclosure around 3 shapes, likely selection"
}
```

---

## DATA PERSISTENCE

### localStorage Keys

```typescript
// User fingerprints from onboarding
"metamedium_fingerprints_v1" → UserFingerprints

// Library of saved shapes
"metamedium_library_v1" → Library

// API keys (encrypted)
"metamedium_api_keys_v1" → { haiku?: string, sonnet?: string, openai?: string }

// Settings
"metamedium_settings_v1" → {
  defaultTier: 0 | 1 | 2,
  autoAcceptThreshold: number,
  onboardingComplete: boolean
}
```

---

## SUCCESS CRITERIA

### Phase 1-2 Complete When:
- [ ] Can complete onboarding in <2 minutes
- [ ] Fingerprints persist across sessions
- [ ] Selection gesture works reliably
- [ ] Context menu appears with options

### Phase 3-4 Complete When:
- [ ] MCP server exposes canvas state
- [ ] Claude Desktop can see and interpret drawings
- [ ] In-browser LLM recognizes primitives offline

### Phase 5-6 Complete When:
- [ ] Tier escalation works automatically
- [ ] Compositions are recognized via API
- [ ] "Explain this" provides useful reasoning

### Phase 7-8 Complete When:
- [ ] UI feels native, not modal
- [ ] Demo scenario works end-to-end
- [ ] Documentation is clear

---

## TECHNICAL NOTES

### WebLLM Integration

```typescript
import { CreateMLCEngine } from "@mlc-ai/web-llm";

const engine = await CreateMLCEngine("Llama-3.2-1B-Instruct-q4f16_1-MLC");

async function interpretStrokeLocal(stroke: Point[], context: InterpretContext) {
  const prompt = formatInterpretationPrompt(stroke, context);
  const response = await engine.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 200,
  });
  return parseInterpretationResponse(response.choices[0].message.content);
}
```

### MCP Server Setup

```typescript
// server.ts
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server({
  name: "metamedium",
  version: "4.0.0",
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: "canvas://state", name: "Canvas State" },
    { uri: "library://items", name: "Library Items" },
    { uri: "fingerprints://user", name: "User Fingerprints" },
  ],
}));

// ... tool handlers
```

---

## APPENDIX: Preserved From v3

### Geometry Utilities (Keep As-Is)
- `getBounds()`, `calculateStraightness()`, `isStrokeClosed()`
- `getFingerprint()`, `countCorners()`, `convexHull()`
- `smoothStroke()`, `simplifyStroke()`, `normalizeStroke()`

### Spatial Graph (Keep As-Is)
- `buildSpatialGraph()`, `checkIntersection()`, `checkContainment()`
- Connection and containment detection

### Type System (Extend)
- Add `UserFingerprints`, `FingerprintRange`, `SelectionState`
- Add MCP-related types

### Library Structure (Keep As-Is)
- `LibraryItem`, `Component`, `CompositionFingerprint`
- `basedOn`, `components`, `spatialGraph`

---

**END OF PRD v4**

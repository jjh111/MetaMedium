# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MetaMedium** is a recombinatorial drawing system that demonstrates how interfaces can learn user vocabularies, recognize compositional patterns in real-time, and evolve through use. This is the practical implementation of concepts from the "Beyond Chat: Designing the Next Generation of AI Interaction" whitepaper.

The core innovation: recursive composition with preserved semantics, multi-scale recognition (single-stroke to multi-stroke), and an extensible learning system that adapts to user drawing style.

## Current Status

**Day 1 Complete** - Basic drawing with primitive shape recognition is fully functional.

Available versions:
- `day1-standalone.html` - Single-file vanilla JS implementation (works anywhere, ~14KB)
- `day1-standalone-improved.html` - Enhanced recognition with size-relative thresholds
- `day1-debug-version.html` - Debug version with detailed metrics display

The React/TypeScript development version is located at `/home/claude/recombinatorial-demo/` (referenced in docs but may be in different environment).

## Architecture

### Core Data Model

**Strokes and Context (Day 1)**
```javascript
strokes = [
  [{x: 10, y: 20}, {x: 15, y: 25}, ...],  // stroke 0
  [{x: 50, y: 60}, {x: 55, y: 65}, ...]   // stroke 1
]

context = [
  'circle',    // stroke 0 is a circle
  'line'       // stroke 1 is a line
]
```

Context array maps 1:1 with strokes array. Unnamed strokes use placeholder `'art[n]'`.

**Recognition Engine**

The system uses geometric fingerprinting with heuristic-based detection:

```javascript
fingerprint = {
  aspectRatio: width / height,
  straightness: directDistance / pathLength,  // 0-1, 1 = perfectly straight
  isClosed: startEndDistance < threshold,
  bounds: { minX, maxX, minY, maxY },
  size: max(width, height)
}
```

### Recognition Thresholds (v1.1 - Improved)

**Circle Detection:**
- Aspect ratio: 0.6 to 1.4 (±0.4 from 1.0)
- Straightness: < 0.4 (curvy)
- Closure: < 50px OR < 15% of shape size
- Confidence: 0.8

**Line Detection:**
- Straightness: > 0.75
- Not closed: > 50px gap OR > 15% of size
- Confidence: 0.9

**Rectangle Detection:**
- Straightness: 0.5 to 0.75 (between circles and lines)
- Closure: < 50px OR < 15% of shape size
- Confidence: 0.7

**Key Innovation:** Size-relative closure detection (`distance < 50 || distance/size < 0.15`) allows the system to scale naturally with drawing size - small shapes need tighter closure, large shapes can have bigger gaps.

### Core Utilities

**Geometric Functions** (found in standalone HTML files):
- `getBounds(points)` - Calculate bounding box
- `isStrokeClosed(points, threshold)` - Check if start/end points are close
- `calculateStraightness(points)` - Ratio of direct distance to path length
- `getFingerprint(points)` - Extract all geometric features
- `analyzeStroke(points)` - Return array of shape matches with confidence

**Spatial Utilities** (for Day 3+):
- `checkOverlap(boundsA, boundsB)` - Bounding box intersection
- `checkTouching(boundsA, boundsB, threshold)` - Close proximity
- `checkContainment(boundsOuter, boundsInner)` - One shape inside another
- `checkProximity(boundsA, boundsB)` - Directional relationships

## Development Roadmap

### Day 1: ✅ Complete
- Basic drawing with mouse events
- Primitive recognition (circle, line, rectangle)
- Accept/reject suggestions
- Custom naming
- Visual feedback (accepted shapes turn blue)

### Day 2: Library + Persistence (Next)
- Library data structure for storing shapes
- Save primitives with fingerprints
- localStorage persistence
- Example-based matching for user shapes
- Export/import library

### Day 3: Simple Compositions + Spatial Graph
- Save multi-stroke drawings as compositions
- Build spatial graph (connections between strokes)
- Visualize relationships

### Day 4: Multi-Stroke Recognition
- Recognize saved compositions while drawing
- Three-tier spatial graph (connections, containment, proximity)
- Composition fingerprints

### Day 5: Built-in Compositions + Smart Recognition
- Add triangle, arrow, cross, star, grid
- Multi-scale recognition (same shape drawn different ways)
- Auto-accept high confidence

### Day 6: Reference System + Semantic Queries
- Add `basedOn` field to primitives
- Add `components` array to compositions
- Hierarchical dependency resolution
- Semantic queries ("count all lines in view")

### Day 7: Extensible Recognition + Learning
- Recognition methods as data
- Learning from corrections
- Export/import recognition profiles
- User style adaptation

## Technical Specifications

**Performance Targets:**
- Drawing latency: <16ms (60fps)
- Recognition time: <50ms (Day 1-2), <100ms (Day 5-7)
- Canvas size: 800x600 default
- Max points per stroke: 500

**Data Limits:**
- Max strokes per composition: 50
- Max composition depth: 5 levels
- Max library size: 100 items

**Browser Support:**
- Chrome 100+, Safari 15+, Firefox 100+
- Mouse/trackpad input only for v1.0

## Design System

**Colors:**
- Primary/Accepted: `#0066ff` (blue)
- Pending: `#666666` (gray)
- Success: `#4CAF50` (green)
- Warning: `#ff9800` (orange)
- Error: `#ff5252` (red)
- Background: `#f5f5f5`
- Text: `#333333`

**Visual Feedback:**
- Unaccepted strokes: gray (#666666)
- Accepted strokes: blue (#0066ff)
- High confidence suggestions: green text
- Medium confidence suggestions: orange text

## Working with the Codebase

### Standalone HTML Files

All functionality is self-contained in single HTML files with inline CSS and JavaScript. To modify:

1. Open the HTML file directly
2. Edit the `<style>` section for CSS changes
3. Edit the `<script>` section for JavaScript logic
4. Test by opening in browser or using `python -m http.server 8000`

### React/TypeScript Version (Day 2+)

When the React version becomes active:

```bash
cd /home/claude/recombinatorial-demo

# Development server
npm run dev

# Production build
npm run build

# Preview build
npm run preview
```

**Project Structure:**
```
src/
  components/
    Canvas.tsx              # Drawing surface
    RecognitionPanel.tsx    # Suggestions UI
    LibraryPanel.tsx        # Saved shapes (Day 2+)
  lib/
    recognition.ts          # Shape detection
    spatial.ts              # Spatial relationships (Day 3+)
    library.ts              # Library management (Day 2+)
  utils/
    geometry.ts             # Geometric calculations
  types/
    index.ts                # TypeScript types
```

## Key Algorithms

**Straightness Calculation:**
```
straightness = directDistance / pathLength
- 1.0 = perfectly straight line
- <0.4 = curved (circle territory)
- 0.5-0.75 = somewhat straight (rectangle)
- >0.75 = very straight (line)
```

**Size-Relative Closure:**
```
isClosed = (distance < 50px) OR (distance / shapeSize < 0.15)
```
This allows 30px shape to accept 4.5px gap, 300px shape to accept 45px gap.

**Shape Separation Strategy:**
Straightness ranges create clear boundaries:
- 0.0-0.4: Circles (curved)
- 0.4-0.5: Gap (no matches)
- 0.5-0.75: Rectangles
- 0.75-1.0: Lines

## Development Philosophy

**Daily Shipping:**
- Each day must ship a working, testable feature
- No infrastructure-only days
- Demo at end of day
- Fix critical bugs before new features

**Simple First:**
- Build simplest thing that works
- Add complexity only when needed
- Refactor when patterns emerge
- Function over form early on

**Progressive Enhancement:**
- Day 1: Hardcoded heuristics
- Day 2-5: Example-based matching
- Day 6: Hierarchical references
- Day 7: Data-driven learning

## Testing Scenarios

**Day 1 Success Criteria:**
- Draw circle → suggests "Circle" → accept → turns blue ✓
- Draw line → suggests "Line" → accept → turns blue ✓
- Draw rectangle → suggests "Rectangle" → accept → works ✓
- Draw blob → "Something else" → custom name → works ✓
- Clear canvas → everything resets ✓
- Recognition < 50ms per stroke ✓
- No drawing lag ✓

## Future Context

**What to preserve when evolving:**
- Current recognition logic (will be enhanced, not replaced)
- Fingerprinting system (will be reused)
- Geometric utilities (will be expanded)
- Simple data structures (will grow, not rebuild)

**What will change:**
- Day 2: Add library data structure
- Day 3: Extend with spatial graphs
- Day 6: Add reference resolution
- Day 7: Move recognition logic to data

**Backward Compatibility:**
When migrating to later days, keep `context` array for compatibility while adding new structures (`components`, `basedOn`).

## Common Pitfalls to Avoid

1. Don't over-engineer early days
2. Don't optimize prematurely
3. Don't build infrastructure without user value
4. Don't hardcode more than necessary
5. Each day must be independently shippable

## Vision

This system demonstrates that interfaces can:
- Learn user-specific visual vocabularies
- Recognize compositional patterns recursively
- Answer semantic queries about drawings
- Adapt recognition based on corrections
- Enable drawing as a form of programming

The end result: **draw circle → save as "bubble" → draw 3 bubbles + lines → save as "molecule" → system recognizes "molecule" pattern automatically**.

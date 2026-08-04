# RECOMBINATORIAL DRAWING SYSTEM - COMPLETE DEVELOPER DOCUMENTATION

**Version:** 3.2 FINAL  
**Purpose:** Source of truth for building compositional drawing demo  
**Timeline:** 7 days to v1.0, each day shippable  
**Date:** October 15, 2025

---

## QUICK START FOR DEVELOPER

### Your Mission
Build a web-based drawing system that proves interfaces can learn user vocabularies, recognize compositional patterns, and evolve through use. Ship working MVPs daily over 7 days.

### Design Direction
- **Visual Style:** Clean, minimal, professional
- **Colors:** 
  - Primary/Accepted: `#0066ff` (blue)
  - Pending: `#666666` (gray)
  - Success: `#4CAF50` (green)
  - Background: `#f5f5f5`
  - Text: `#333333`
- **Layout:** Large canvas center, library panel left, recognition panel right
- **Priority:** Function over form - make it work, then make it pretty

### Example Interaction Flow
```
1. User draws circle with mouse
2. Recognition panel appears: "Circle (high) | Rectangle (low) | Something else"
3. User clicks "Circle"
4. Stroke turns blue, panel dismisses
5. User clicks "Save as primitive"
6. Dialog: "What should we call this?" → types "bubble"
7. Bubble appears in library panel
8. User draws another circle
9. Recognition: "Circle (high) | Bubble (high) | Something else"
10. User clicks "Bubble" → stroke accepted
```

### Instructions
1. Read this complete document first
2. Start with Day 1 - basic drawing + primitive recognition
3. Check in after each day - show what works, get feedback
4. Flag ambiguities immediately
5. Each day must ship something testable
6. Use the code examples - they're implementation-ready

**Philosophy:** Start simple, ship daily, add intelligence progressively. Don't over-engineer early.

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Development Philosophy](#development-philosophy)
3. [Data Model Evolution](#data-model-evolution)
4. [Core Utility Functions](#core-utility-functions)
5. [Built-in Library](#built-in-library)
6. [7-Day Development Plan](#7-day-development-plan)
   - [Day 1: Basic Drawing + Primitive Recognition](#day-1-basic-drawing--primitive-recognition)
   - [Day 2: Library + Persistence](#day-2-library--persistence)
   - [Day 3: Simple Compositions + Spatial Graph](#day-3-simple-compositions--spatial-graph)
   - [Day 4: Multi-Stroke Recognition](#day-4-multi-stroke-recognition)
   - [Day 5: Built-in Compositions + Smart Recognition](#day-5-built-in-compositions--smart-recognition)
   - [Day 6: Reference System + Semantic Queries](#day-6-reference-system--semantic-queries)
   - [Day 7: Extensible Recognition + Learning](#day-7-extensible-recognition--learning)
7. [Technical Specifications](#technical-specifications)
8. [Persistence Strategy](#persistence-strategy)
9. [Testing Scenarios](#testing-scenarios)
10. [Post-MVP Roadmap](#post-mvp-roadmap)
11. [File Structure](#file-structure)
12. [Context for Future Development](#context-for-future-development)

---

## EXECUTIVE SUMMARY

Building a web-based drawing demo that proves the core concepts from "Beyond Chat: Designing the Next Generation of AI Interaction" whitepaper. This is a **compositional, semantic, searchable, learning drawing system** where every mark is simultaneously geometric data, semantic meaning, and potential building block for higher-order compositions.

### Core Innovation

1. **Recursive composition** with preserved semantics and fully relational architecture
2. **Multi-scale recognition** that handles single-stroke, multi-stroke, and temporal patterns
3. **Extensible learning system** that adapts to user style and grows vocabulary over time

### User Capabilities

Users can:
- Draw circle → save as "bubble" → draw 3 bubbles + lines → save as "molecule" → draw 2 molecules → save as "reaction"
- Draw shapes in any number of strokes (star as 1 stroke or 5 strokes)
- System recognizes patterns predictively and adapts to individual drawing style
- Query semantically: "how many lines are in view?" (counts lines in primitives AND compositions)

### Why This Matters

Demonstrates that interfaces can learn user-specific visual vocabularies, recognize compositional patterns in real-time, and evolve their intelligence based on use - making the whitepaper's vision tangible and interactive.

### Critical Success Factor

Each day ships a **working, testable, impressive demo**. No infrastructure-only days.

---

## DEVELOPMENT PHILOSOPHY

### What "MVP at Each Step" Actually Means

**Good Daily MVP:**
1. ✅ New user can open the app
2. ✅ Do something meaningful immediately
3. ✅ See value without waiting for future features
4. ✅ Be impressed by what works (even if scope is limited)

**Bad Daily "MVP":**
1. ❌ Infrastructure exists but nothing works end-to-end
2. ❌ User can't actually accomplish a task
3. ❌ Have to wait for "Day 7" for anything useful
4. ❌ Just plumbing with no user-facing value

### Build Philosophy: Simple First, Complex Later

**Don't build:**
- Reference system before you have nested compositions
- Extensible recognition before you know what works
- Three-tier spatial before you need all 3 tiers
- Learning system before basic recognition works

**Do build:**
- Simplest thing that could work
- Add complexity when you actually need it
- Refactor when patterns emerge naturally
- Ship working features, not infrastructure

### Daily Rhythm

**Each day has:**
- **Morning:** Build new capability (4 hours)
- **Afternoon:** Make it work well + test (4 hours)
- **End of day:** Demo to user, get feedback
- **Evening:** Fix critical bugs, prepare for next day

---

## DATA MODEL EVOLUTION

Understanding how data structures evolve across the 7 days is critical.

### Day 1: Basic Strokes + Context
```javascript
// Simple arrays
const strokes = [
  [{x: 10, y: 20}, {x: 15, y: 25}, ...],  // stroke 0
  [{x: 50, y: 60}, {x: 55, y: 65}, ...],  // stroke 1
];

const context = [
  'circle',    // stroke 0 is a circle
  'line',      // stroke 1 is a line
  'art[2]'     // stroke 2 is unnamed (placeholder)
];
```

**Key:** Context array maps 1:1 with strokes array.

---

### Day 2: Add Library with Primitives
```javascript
const library = {
  // Built-in primitives (always present)
  'circle': {
    type: 'builtin-primitive',
    shapeType: 'circle',
    label: 'Circle',
    usageCount: 0
  },
  
  'line': {
    type: 'builtin-primitive',
    shapeType: 'line',
    label: 'Line',
    usageCount: 0
  },
  
  'rectangle': {
    type: 'builtin-primitive',
    shapeType: 'rectangle',
    label: 'Rectangle',
    usageCount: 0
  },
  
  // User-saved primitive (NEW in Day 2)
  'bubble': {
    type: 'user-primitive',
    label: 'Bubble',
    strokes: [[{x,y}, {x,y}, ...]],  // The saved stroke
    fingerprint: {
      aspectRatio: 0.95,
      straightness: 0.23,
      isClosed: true,
      bounds: {minX: 10, maxX: 50, minY: 20, maxY: 60},
      size: 40
    },
    usageCount: 3,
    created: 1699564800000
  }
};
```

**Key:** `basedOn` field does NOT exist yet (that's Day 6).

---

### Day 3: Add Compositions with Simple Context
```javascript
library.molecule = {
  type: 'user-composition',
  label: 'Molecule',
  
  // All strokes flattened
  strokes: [
    [{x,y}, ...],  // bubble 1
    [{x,y}, ...],  // bubble 2
    [{x,y}, ...],  // bubble 3
    [{x,y}, ...],  // line 1
    [{x,y}, ...]   // line 2
  ],
  
  // Simple string array (what each stroke is)
  context: ['bubble', 'bubble', 'bubble', 'line', 'line'],
  
  // Spatial graph (connections only on Day 3)
  spatialGraph: {
    connections: [
      { a: 0, b: 1, type: 'overlapping', strength: 0.3 },
      { a: 1, b: 2, type: 'touching', strength: 0.1 }
    ]
  },
  
  usageCount: 1,
  created: 1699564900000
};
```

**Key:** No `components` array yet (that's Day 6). Just `context` for now.

---

### Day 4: Add Three-Tier Spatial Graph
```javascript
library.molecule = {
  ...existing_fields,
  
  // Expanded spatial graph (NEW: containment + proximity)
  spatialGraph: {
    connections: [
      { a: 0, b: 1, type: 'overlapping', strength: 0.3 }
    ],
    
    // NEW in Day 4
    containment: [
      { outer: 3, inner: 0, concentricity: 0.8, fill: 0.4 }
    ],
    
    // NEW in Day 4
    proximity: [
      { a: 0, b: 3, distance: 45, normalizedDistance: 0.8, direction: 'right', alignment: 0.9 }
    ]
  },
  
  // NEW in Day 4: Fingerprint for matching
  fingerprint: {
    strokeCount: 5,
    shapeDistribution: { circular: 3, linear: 2 },
    spatialPattern: { type: 'connected-nodes', density: 0.8 }
  }
};
```

---

### Day 5: Add Built-in Compositions
```javascript
library.triangle = {
  type: 'builtin-composition',
  label: 'Triangle',
  
  strokes: [
    /* 3 perfect line strokes forming triangle */
  ],
  
  context: ['line', 'line', 'line'],
  
  spatialGraph: {
    connections: [
      { a: 0, b: 1, type: 'touching', strength: 1.0 },
      { a: 1, b: 2, type: 'touching', strength: 1.0 },
      { a: 2, b: 0, type: 'touching', strength: 1.0 }
    ],
    containment: [],
    proximity: []
  },
  
  fingerprint: {
    strokeCount: 3,
    shapeDistribution: { linear: 3 },
    spatialPattern: { type: 'closed-polygon', sides: 3 }
  },
  
  level: 1,  // Composition depth
  builtin: true
};

library.arrow = {
  type: 'builtin-composition',
  label: 'Arrow',
  
  strokes: [
    /* 4 strokes: 1 line (shaft) + 3 lines (triangle head) */
  ],
  
  context: ['line', 'line', 'line', 'line'],  // Flattened
  
  spatialGraph: {
    connections: [
      { a: 0, b: 1, type: 'touching', strength: 0.9 }
    ],
    containment: [],
    proximity: []
  },
  
  fingerprint: {
    strokeCount: 4,
    shapeDistribution: { linear: 4 },
    spatialPattern: { type: 'directed-shape' }
  },
  
  level: 2,  // Contains triangle (level 1), so arrow is level 2
  builtin: true
};
```

**Note:** Day 5 compositions use flattened `context` array. The hierarchical structure (arrow = line + triangle) is implicit, not explicit yet.

---

### Day 6: Add Reference System (Components + BasedOn)
```javascript
// Migrate user primitives to add basedOn
library.bubble = {
  type: 'user-primitive',
  label: 'Bubble',
  strokes: [[{x,y}, ...]],
  
  basedOn: 'circle',  // NEW: Links to builtin primitive
  
  fingerprint: { /* ... */ },
  usageCount: 3,
  created: 1699564800000
};

// Migrate compositions to use structured components
library.molecule = {
  type: 'user-composition',
  label: 'Molecule',
  strokes: [ /* ... */ ],
  
  // Keep simple context for backward compatibility
  context: ['bubble', 'bubble', 'bubble', 'line', 'line'],
  
  // NEW: Structured components with references
  components: [
    { ref: 'bubble', strokeIndices: [0] },
    { ref: 'bubble', strokeIndices: [1] },
    { ref: 'bubble', strokeIndices: [2] },
    { ref: 'line', strokeIndices: [3] },
    { ref: 'line', strokeIndices: [4] }
  ],
  
  spatialGraph: { /* ... */ },
  fingerprint: { /* ... */ },
  level: 2
};

library.arrow = {
  type: 'builtin-composition',
  label: 'Arrow',
  strokes: [ /* ... */ ],
  context: ['line', 'line', 'line', 'line'],
  
  // NEW: Shows hierarchical structure explicitly
  components: [
    { ref: 'line', strokeIndices: [0] },           // Shaft
    { ref: 'triangle', strokeIndices: [1, 2, 3] }  // Head (nested!)
  ],
  
  spatialGraph: { /* ... */ },
  fingerprint: { /* ... */ },
  level: 2,
  builtin: true
};
```

**Key:** Day 6 adds `basedOn` to primitives and `components` to compositions. Context remains for compatibility.

---

### Day 7: Add Recognition Methods
```javascript
const recognitionMethods = {
  'star': {
    type: 'geometric-heuristic',
    version: '1.0',
    builtin: true,
    
    features: [
      { name: 'directionChanges', weight: 0.3, range: [8, 12] },
      { name: 'radialSymmetry', weight: 0.3, min: 0.6 },
      { name: 'isClosed', weight: 0.2, value: true },
      { name: 'aspectRatio', weight: 0.2, range: [0.7, 1.3] }
    ],
    
    matcher: 'geometricFeatureMatcher',
    
    learningData: {
      successfulMatches: 0,
      corrections: [],
      averageFeatureValues: {}
    }
  },
  
  'bubble': {
    type: 'learned-from-examples',
    version: '1.0',
    builtin: false,
    
    examples: [
      { strokes: [[{x,y}, ...]], fingerprint: {...}, timestamp: 1699564800000 }
    ],
    
    matcher: 'exampleBasedMatcher',
    
    learningData: {
      successfulMatches: 5,
      corrections: [],
      averageFingerprint: { aspectRatio: 0.95, straightness: 0.23, ... }
    }
  }
};

const matchers = {
  'geometricFeatureMatcher': function(stroke, method) { /* ... */ },
  'exampleBasedMatcher': function(stroke, method) { /* ... */ }
};
```

**Key:** Recognition logic moves from hardcoded functions to data-driven methods.

---

## CORE UTILITY FUNCTIONS

These are the essential geometric and fingerprinting functions needed throughout development.

### Geometric Utilities
```javascript
function getBounds(stroke) {
  if (stroke.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  stroke.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  
  return { minX, maxX, minY, maxY };
}

function isStrokeClosed(stroke, threshold = 20) {
  if (stroke.length < 5) return false;
  
  const start = stroke[0];
  const end = stroke[stroke.length - 1];
  const distance = Math.sqrt(
    Math.pow(end.x - start.x, 2) + 
    Math.pow(end.y - start.y, 2)
  );
  
  return distance < threshold;
}

function calculateStraightness(stroke) {
  if (stroke.length < 2) return 0;
  
  const start = stroke[0];
  const end = stroke[stroke.length - 1];
  
  // Direct distance (as the crow flies)
  const directDistance = Math.sqrt(
    Math.pow(end.x - start.x, 2) + 
    Math.pow(end.y - start.y, 2)
  );
  
  // Actual path length
  let pathLength = 0;
  for (let i = 1; i < stroke.length; i++) {
    const dx = stroke[i].x - stroke[i-1].x;
    const dy = stroke[i].y - stroke[i-1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }
  
  if (pathLength === 0) return 0;
  
  // Ratio: 1.0 = perfectly straight, <1.0 = curved
  return directDistance / pathLength;
}

function getStrokeSize(stroke) {
  const bounds = getBounds(stroke);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return Math.max(width, height);
}
```

### Fingerprint Generation
```javascript
function getFingerprint(stroke) {
  const bounds = getBounds(stroke);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  
  return {
    aspectRatio: height === 0 ? 1 : width / height,
    straightness: calculateStraightness(stroke),
    isClosed: isStrokeClosed(stroke),
    bounds: bounds,
    size: Math.max(width, height),
    pointCount: stroke.length
  };
}
```

### Spatial Relationship Utilities
```javascript
function checkOverlap(boundsA, boundsB) {
  // Bounding boxes overlap
  return !(boundsB.minX > boundsA.maxX || 
           boundsB.maxX < boundsA.minX ||
           boundsB.minY > boundsA.maxY ||
           boundsB.maxY < boundsA.minY);
}

function checkTouching(boundsA, boundsB, threshold = 10) {
  // Boxes are very close (within threshold pixels)
  const minDistance = getMinDistance(boundsA, boundsB);
  return minDistance < threshold && minDistance >= 0;
}

function getMinDistance(boundsA, boundsB) {
  // If overlapping, distance is 0
  if (checkOverlap(boundsA, boundsB)) return 0;
  
  // Calculate minimum distance between boxes
  const dx = Math.max(boundsA.minX - boundsB.maxX, boundsB.minX - boundsA.maxX, 0);
  const dy = Math.max(boundsA.minY - boundsB.maxY, boundsB.minY - boundsA.maxY, 0);
  
  return Math.sqrt(dx * dx + dy * dy);
}

function checkContainment(boundsOuter, boundsInner) {
  // Is inner completely inside outer?
  return boundsInner.minX >= boundsOuter.minX &&
         boundsInner.maxX <= boundsOuter.maxX &&
         boundsInner.minY >= boundsOuter.minY &&
         boundsInner.maxY <= boundsOuter.maxY;
}

function checkProximity(boundsA, boundsB) {
  const distance = getMinDistance(boundsA, boundsB);
  const sizeA = Math.max(boundsA.maxX - boundsA.minX, boundsA.maxY - boundsA.minY);
  const sizeB = Math.max(boundsB.maxX - boundsB.minX, boundsB.maxY - boundsB.minY);
  const avgSize = (sizeA + sizeB) / 2;
  
  const normalizedDist = avgSize === 0 ? Infinity : distance / avgSize;
  
  // Within 2x average size = adjacent
  return normalizedDist < 2.0 ? {
    distance: distance,
    normalizedDistance: normalizedDist,
    direction: getDirection(boundsA, boundsB),
    alignment: getAlignment(boundsA, boundsB)
  } : null;
}

function getDirection(boundsA, boundsB) {
  const centerAX = (boundsA.minX + boundsA.maxX) / 2;
  const centerAY = (boundsA.minY + boundsA.maxY) / 2;
  const centerBX = (boundsB.minX + boundsB.maxX) / 2;
  const centerBY = (boundsB.minY + boundsB.maxY) / 2;
  
  const dx = centerBX - centerAX;
  const dy = centerBY - centerAY;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else {
    return dy > 0 ? 'below' : 'above';
  }
}

function getAlignment(boundsA, boundsB) {
  // How aligned are they on their dominant axis?
  const centerAX = (boundsA.minX + boundsA.maxX) / 2;
  const centerAY = (boundsA.minY + boundsA.maxY) / 2;
  const centerBX = (boundsB.minX + boundsB.maxX) / 2;
  const centerBY = (boundsB.minY + boundsB.maxY) / 2;
  
  const horizontalAlignment = 1 - Math.abs(centerAY - centerBY) / 
    Math.max(boundsA.maxY - boundsA.minY, boundsB.maxY - boundsB.minY, 1);
  const verticalAlignment = 1 - Math.abs(centerAX - centerBX) / 
    Math.max(boundsA.maxX - boundsA.minX, boundsB.maxX - boundsB.minX, 1);
  
  return Math.max(horizontalAlignment, verticalAlignment);
}
```

### Feature Extraction (Day 7)
```javascript
function countDirectionChanges(points) {
  if (points.length < 3) return 0;
  
  let changes = 0;
  let prevAngle = null;
  
  for (let i = 2; i < points.length; i++) {
    const dx1 = points[i-1].x - points[i-2].x;
    const dy1 = points[i-1].y - points[i-2].y;
    const dx2 = points[i].x - points[i-1].x;
    const dy2 = points[i].y - points[i-1].y;
    
    const angle1 = Math.atan2(dy1, dx1);
    const angle2 = Math.atan2(dy2, dx2);
    
    if (prevAngle !== null) {
      let angleDiff = Math.abs(angle2 - angle1);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      
      // Significant direction change (>30 degrees)
      if (angleDiff > Math.PI / 6) {
        changes++;
      }
    }
    
    prevAngle = angle2;
  }
  
  return changes;
}

function calculateRadialSymmetry(points, folds = 5) {
  // For star detection: check if points are roughly evenly distributed
  // around center in N-fold symmetry
  
  if (points.length < folds * 2) return 0;
  
  // Find center
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  
  // Get angles of all points from center
  const angles = points.map(p => Math.atan2(p.y - centerY, p.x - centerX));
  
  // Sort angles
  angles.sort((a, b) => a - b);
  
  // Check if angles are evenly distributed
  const expectedAngleStep = (2 * Math.PI) / folds;
  let symmetryScore = 0;
  
  for (let i = 0; i < folds; i++) {
    const expectedAngle = i * expectedAngleStep;
    const closestActualAngle = angles.reduce((closest, angle) => {
      const diff = Math.abs(angle - expectedAngle);
      return diff < Math.abs(closest - expectedAngle) ? angle : closest;
    });
    
    const error = Math.abs(closestActualAngle - expectedAngle);
    symmetryScore += 1 - (error / expectedAngleStep);
  }
  
  return symmetryScore / folds;  // 0-1 score
}

function compareFingerprints(fp1, fp2) {
  // Simple similarity score between two fingerprints
  let score = 0;
  let factors = 0;
  
  // Aspect ratio similarity
  const aspectDiff = Math.abs(fp1.aspectRatio - fp2.aspectRatio);
  score += Math.max(0, 1 - aspectDiff);
  factors++;
  
  // Straightness similarity
  const straightDiff = Math.abs(fp1.straightness - fp2.straightness);
  score += Math.max(0, 1 - straightDiff);
  factors++;
  
  // Closure match (binary)
  if (fp1.isClosed === fp2.isClosed) {
    score += 1;
  }
  factors++;
  
  // Size similarity (normalized)
  const sizeDiff = Math.abs(fp1.size - fp2.size) / Math.max(fp1.size, fp2.size, 1);
  score += Math.max(0, 1 - sizeDiff);
  factors++;
  
  return score / factors;  // 0-1 similarity
}
```

---

## BUILT-IN LIBRARY

### Day 1: Primitives Only

System ships with **3 built-in primitives**:

1. **Circle** - Closed circular shape
2. **Line** - Straight connector  
3. **Rectangle** - Rectangular container

**Detection (Simple Heuristics):**
```javascript
function analyzeStroke(stroke) {
  const fp = getFingerprint(stroke);
  const results = [];
  
  // Circle: closed, square-ish aspect ratio, curvy
  if (fp.isClosed && Math.abs(fp.aspectRatio - 1) < 0.3 && fp.straightness < 0.3) {
    results.push({ type: 'circle', confidence: 0.8 });
  }
  
  // Line: straight, not closed
  if (fp.straightness > 0.85 && !fp.isClosed) {
    results.push({ type: 'line', confidence: 0.9 });
  }
  
  // Rectangle: closed, straightish edges, 4 corners
  if (fp.isClosed && fp.straightness > 0.6) {
    results.push({ type: 'rectangle', confidence: 0.7 });
  }
  
  return results.sort((a, b) => b.confidence - a.confidence);
}
```

### Day 5: Add Built-in Compositions

System adds **5 built-in compositions**:

1. **Triangle** (3 lines) - 3-sided polygon
2. **Arrow** (1 line + 1 triangle) - Directional pointer
3. **Cross** (2 lines) - Intersecting perpendicular lines
4. **Star** (5 or 10 lines) - 5-pointed star
5. **Grid** (4 lines) - 2 horizontal + 2 vertical lines

These demonstrate compositional thinking and ship with perfect reference implementations.

---

## 7-DAY DEVELOPMENT PLAN

### Day 1: Basic Drawing + Primitive Recognition ⭐

**Goal:** User can draw and system recognizes circles, lines, rectangles

**Morning (4 hours): Drawing Works**

- [ ] **Project setup**
  - [ ] Create Vite + React + TypeScript project
  - [ ] Install dependencies (no external libs needed yet)
  - [ ] Clean out boilerplate

- [ ] **Canvas component**
```typescript
  interface Point {
    x: number;
    y: number;
  }
  
  interface Stroke {
    points: Point[];
    timestamp: number;
  }
  
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
```

- [ ] **Mouse event handlers**
```typescript
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setIsDrawing(true);
    setCurrentStroke([point]);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setCurrentStroke(prev => [...prev, point]);
  };
  
  const handleMouseUp = () => {
    if (currentStroke.length > 0) {
      const newStroke: Stroke = {
        points: currentStroke,
        timestamp: Date.now()
      };
      setStrokes(prev => [...prev, newStroke]);
      analyzeAndSuggest(newStroke);
    }
    setIsDrawing(false);
    setCurrentStroke([]);
  };
```

- [ ] **Simple stroke rendering**
```typescript
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw completed strokes
    strokes.forEach((stroke, idx) => {
      ctx.strokeStyle = context[idx] !== `art[${idx}]` ? '#0066ff' : '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      stroke.points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });
    
    // Draw current stroke
    if (currentStroke.length > 0) {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      currentStroke.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
  }, [strokes, currentStroke, context]);
```

**Afternoon (4 hours): Recognition Works**

- [ ] **Implement utility functions**
  - [ ] `getBounds(stroke)`
  - [ ] `isStrokeClosed(stroke)`
  - [ ] `calculateStraightness(stroke)`
  - [ ] `getFingerprint(stroke)`

- [ ] **Shape detection**
```typescript
  function analyzeStroke(stroke: Stroke) {
    const fp = getFingerprint(stroke.points);
    const results = [];
    
    if (fp.isClosed && Math.abs(fp.aspectRatio - 1) < 0.3 && fp.straightness < 0.3) {
      results.push({ type: 'circle', confidence: 0.8, label: 'Circle' });
    }
    
    if (fp.straightness > 0.85 && !fp.isClosed) {
      results.push({ type: 'line', confidence: 0.9, label: 'Line' });
    }
    
    if (fp.isClosed && fp.straightness > 0.6) {
      results.push({ type: 'rectangle', confidence: 0.7, label: 'Rectangle' });
    }
    
    return results.sort((a, b) => b.confidence - a.confidence);
  }
```

- [ ] **Recognition panel component**
```typescript
  interface Suggestion {
    type: string;
    confidence: number;
    label: string;
  }
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedStrokeIndex, setSelectedStrokeIndex] = useState<number | null>(null);
  
  function analyzeAndSuggest(stroke: Stroke) {
    const results = analyzeStroke(stroke);
    setSuggestions(results);
    setSelectedStrokeIndex(strokes.length);
  }
  
  // RecognitionPanel.tsx
  <div className="suggestions">
    <p>This looks like:</p>
    {suggestions.map((sug, idx) => (
      <button key={idx} onClick={() => acceptSuggestion(sug)}>
        {sug.label} ({sug.confidence > 0.8 ? 'high' : 'medium'} confidence)
      </button>
    ))}
    <button onClick={handleSomethingElse}>Something else</button>
  </div>
```

- [ ] **Accept interpretation**
```typescript
  const [context, setContext] = useState<string[]>([]);
  
  function acceptSuggestion(suggestion: Suggestion) {
    if (selectedStrokeIndex === null) return;
    
    const newContext = [...context];
    newContext[selectedStrokeIndex] = suggestion.type;
    setContext(newContext);
    
    setSuggestions([]);
    setSelectedStrokeIndex(null);
  }
  
  function handleSomethingElse() {
    const customName = prompt('What should we call this?');
    if (customName && selectedStrokeIndex !== null) {
      const newContext = [...context];
      newContext[selectedStrokeIndex] = customName;
      setContext(newContext);
      
      setSuggestions([]);
      setSelectedStrokeIndex(null);
    }
  }
```

- [ ] **Visual feedback** (accepted strokes change color)

- [ ] **Clear canvas button**
```typescript
  function clearCanvas() {
    setStrokes([]);
    setContext([]);
    setCurrentStroke([]);
    setSuggestions([]);
  }
```

**End of Day 1 Demo:**
```
User: [draws circular shape]
System: "This looks like: Circle (high confidence) | Rectangle (low confidence) | Something else"
User: [clicks "Circle"]
System: [stroke turns blue]

User: [draws straight line]
System: "This looks like: Line (high confidence) | Something else"
User: [clicks "Line"]
System: [stroke turns blue]
```

**Shippable:** ✅ Basic intelligence visible immediately!

**Success Criteria:**
- [ ] Draw circle → suggests "circle" → accept → works ✓
- [ ] Draw line → suggests "line" → accept → works ✓
- [ ] Draw rectangle → suggests "rectangle" → accept → works ✓
- [ ] Visual feedback clear (accepted strokes blue) ✓
- [ ] Clear canvas works ✓
- [ ] Recognition <50ms per stroke ✓
- [ ] No lag when drawing ✓

---

### Day 2: Library + Persistence ⭐

**Goal:** User can save primitives and they persist across sessions

**Morning (4 hours): Save Primitives**

- [ ] **Library data structure**
```typescript
  interface LibraryItem {
    type: 'builtin-primitive' | 'user-primitive';
    label: string;
    shapeType?: string;  // For builtins
    strokes?: Stroke[];  // For user primitives
    fingerprint?: Fingerprint;
    usageCount: number;
    created?: number;
  }
  
  const [library, setLibrary] = useState<Record<string, LibraryItem>>({
    'circle': {
      type: 'builtin-primitive',
      shapeType: 'circle',
      label: 'Circle',
      usageCount: 0
    },
    'line': {
      type: 'builtin-primitive',
      shapeType: 'line',
      label: 'Line',
      usageCount: 0
    },
    'rectangle': {
      type: 'builtin-primitive',
      shapeType: 'rectangle',
      label: 'Rectangle',
      usageCount: 0
    }
  });
```

- [ ] **"Save as primitive" button + dialog**
- [ ] **Library panel component**
- [ ] **Show built-in vs user primitives**

**Afternoon (4 hours): Recognition + Persistence**

- [ ] **Example-based matching**
- [ ] **Update recognition to include user primitives**
- [ ] **localStorage persistence**
- [ ] **Delete library item**
- [ ] **Export library**

**End of Day 2 Demo:**
```
User: [draws circle, saves as "bubble"]
User: [draws another circle]
System: "Circle (high) | Bubble (high) | Something else"
User: [refreshes page]
System: [library still shows "bubble"]
```

**Shippable:** ✅ Building personal library!

---

### Day 3: Simple Compositions + Spatial Graph ⭐

**Goal:** User can save multi-stroke drawings as compositions

**Morning (4 hours): Save Compositions**

- [ ] **Update library type to include compositions**
- [ ] **"Save canvas as composition" button**
- [ ] **Build spatial graph (connections only)**
- [ ] **Update library panel for compositions**

**Afternoon (4 hours): Visual Spatial Relationships**

- [ ] **Composition info panel**
- [ ] **Visualize spatial graph**
- [ ] **Toggle spatial graph visualization**

**End of Day 3 Demo:**
```
User: [draws 3 bubbles + 2 lines, saves as "molecule"]
System: [library shows "molecule (5 strokes, 4 connections)"]
User: [clicks "Show Spatial Graph"]
System: [draws red dashed lines between connected strokes]
```

**Shippable:** ✅ Compositional thinking starts!

---

### Day 4: Multi-Stroke Recognition ⭐

**Goal:** System recognizes when you're drawing a saved composition

**Morning (4 hours): Composition Matching**

- [ ] **Check for composition matches after each stroke**
- [ ] **Composition matching with fuzzy logic**
- [ ] **Accept composition match**

**Afternoon (4 hours): Three-Tier Spatial Graph**

- [ ] **Update spatial graph type (add containment + proximity)**
- [ ] **Enhanced buildSpatialGraph**
- [ ] **Better spatial pattern matching**
- [ ] **Add fingerprint to compositions**
- [ ] **Confidence indicators**

**End of Day 4 Demo:**
```
User: [draws 3 bubbles + 2 lines]
System: [after 5th stroke] "Molecule (high confidence)"
User: [accepts]
System: "✓ Recognized as molecule"
```

**Shippable:** ✅ **THE MAGIC MOMENT** - system understands patterns!

---

### Day 5: Built-in Compositions + Smart Recognition ⭐

**Goal:** System ships with triangle/arrow/star and recognizes them multiple ways

**Morning (4 hours): Built-in Compositions**

- [ ] **Add 5 built-in compositions to library**
  - Triangle, Arrow, Cross, Star, Grid
- [ ] **Visual distinction in library**
- [ ] **Single-stroke composite detection**

**Afternoon (4 hours): Multi-Scale Recognition**

- [ ] **Multi-stroke pattern detection**
- [ ] **Auto-context assignment**
- [ ] **Auto-accept for high confidence**
- [ ] **Notification toast**

**End of Day 5 Demo:**
```
Demo 1: User draws star in 1 stroke → auto-accepts "star"
Demo 2: User draws star in 5 strokes → auto-accepts "star"
Demo 3: User draws arrow (line + triangle) → auto-accepts "arrow"
```

**Shippable:** ✅ Multi-scale recognition feels intelligent!

---

### Day 6: Reference System + Semantic Queries ⭐

**Goal:** System understands composition hierarchy, answers semantic queries

**Morning (4 hours): Reference Resolution**

- [ ] **Migrate primitives to add basedOn**
- [ ] **Migrate compositions to use components**
- [ ] **Implement resolveComponent**
- [ ] **Implement resolveBaseShape (recursive)**
- [ ] **Dependency tree visualization**

**Afternoon (4 hours): Semantic Queries**

- [ ] **"Count X in view" function**
- [ ] **Query panel component**
- [ ] **Search by component**
- [ ] **Search by relationship**

**End of Day 6 Demo:**
```
Setup: Canvas has 2 lines, 1 triangle, 1 arrow

User: [clicks "Count lines"]
System: "9 lines in view"
  Detail: 2 direct + 3 (triangle) + 4 (arrow)

User: [types "triangle" in search]
System: "Compositions with 'triangle': Arrow"

User: [clicks Arrow in library]
System: [shows dependency tree with nesting]
```

**Shippable:** ✅ Compositional semantics visible!

---

### Day 7: Extensible Recognition + Learning ⭐

**Goal:** System learns from corrections and adapts to user style

**Morning (4 hours): Extensible Recognition**

- [ ] **Recognition methods data structure**
- [ ] **Initialize with built-in recognizers**
- [ ] **Matcher function registry**
- [ ] **Refactor recognition to use methods**

**Afternoon (4 hours): Learning System**

- [ ] **Track corrections**
- [ ] **Create recognizer when user saves primitive**
- [ ] **Persistence**
- [ ] **Export/import recognition profile**
- [ ] **Learning stats panel**

**End of Day 7 Demo:**
```
User: [draws loose star, corrects to "messy star"]
System: [creates new recognizer]
User: [draws loose star again]
System: "Messy star (high) | Star (medium)"
User: [exports profile, friend imports it]
Friend: [draws loose star]
System: "Messy star (high)"
```

**Shippable:** ✅ **Complete v1.0** - system learns and adapts!

---

## TECHNICAL SPECIFICATIONS

### Performance Targets
- **Drawing latency:** <16ms (60fps, no jank)
- **Recognition time:** 
  - Day 1-2: <50ms (simple heuristics)
  - Day 3-4: <80ms (spatial graph matching)
  - Day 5-7: <100ms (multi-scale + resolution)
- **Spatial graph build:** <50ms for 20 strokes
- **Library load:** <200ms for 50 items
- **Reference resolution:** <10ms for depth-5 compositions
- **Memory:** <50MB typical session

### Browser Support
- **Primary:** Chrome 100+, Safari 15+, Firefox 100+
- **Input:** Mouse/trackpad only for v1.0
- **Touch/Pen:** Deferred to v1.1
- **Mobile:** Responsive layout but mouse-optimized

### Data Limits
- **Max strokes per composition:** 50
- **Max composition depth:** 5 levels
- **Max library size:** 100 items
- **Max stroke points:** 500 per stroke
- **Spatial relationship threshold:** 2x average size for proximity
- **Recognition window:** Last 10 strokes for pattern matching

---

## PERSISTENCE STRATEGY

### What Gets Saved When

**Day 1:** Nothing persists (refresh = lose work)

**Day 2:** Library only
```typescript
localStorage.setItem('library_v1', JSON.stringify(library));
```

**Day 3-6:** Library (updated structure)
```typescript
localStorage.setItem('library_v1', JSON.stringify(library));
```

**Day 7:** Library + Recognition Methods
```typescript
localStorage.setItem('library_v1', JSON.stringify(library));
localStorage.setItem('recognition_methods_v1', JSON.stringify(recognitionMethods));
```

### What's NOT Saved
- Current canvas state
- Undo/redo history
- UI preferences
- Query results

### Export Features
- **Day 2:** Export library as JSON
- **Day 7:** Export recognition profile as JSON

---

## TESTING SCENARIOS

### Day 1: Basic primitive recognition
1. Draw circle → suggests "circle" ✓
2. Accept → stroke changes color ✓
3. Draw line → suggests "line" ✓
4. Draw rectangle → suggests "rectangle" ✓
5. Clear canvas works ✓

### Day 2: Save and recognize custom primitive
1. Draw circle → accept as "circle" ✓
2. Save as "bubble" ✓
3. Refresh page → bubble in library ✓
4. Draw circle → suggests "circle" AND "bubble" ✓
5. Accept "bubble" → works ✓

### Day 3: Create composition
1. Draw 3 circles (bubbles) + 2 lines ✓
2. Save as "molecule" ✓
3. Library shows "molecule (5 strokes, 4 connections)" ✓
4. Click info → shows component details ✓
5. Spatial graph visualization works ✓

### Day 4: Recognize composition
1. Draw 3 bubbles + 2 lines ✓
2. System suggests "molecule" after 5th stroke ✓
3. Accept → strokes transform ✓
4. Three-tier spatial graph working ✓

### Day 5: Multi-scale star recognition
1. Draw star in 1 stroke → auto-accepts "star" ✓
2. Draw star in 5 strokes → auto-accepts "star" ✓
3. Draw triangle variations → recognized ✓

### Day 6: Semantic queries
1. Canvas: 2 lines + 1 triangle + 1 arrow
2. Count lines → returns 9 ✓
3. Search "triangle" → finds arrow ✓
4. Dependency tree shows nesting ✓

### Day 7: Learning from corrections
1. Draw loose star → correct to "messy star" ✓
2. System creates recognizer ✓
3. Draw loose star → suggests "messy star" first ✓
4. Export/import profile works ✓

---

## POST-MVP ROADMAP

### v1.1 - Performance + Touch Support (Week 2)
- Touch + pen support (Pointer Events API)
- Smooth stroke rendering
- High-DPI canvas
- Undo/redo
- iPad testing

### v1.2 - Advanced Learning (Week 3)
- Automatic promotion
- User style profiles
- Threshold tuning
- Confidence calibration

### v1.3 - UX Polish (Week 4)
- Better visual design
- Animations
- Ghosted suggestions
- Improved library UI
- Tutorial/onboarding

### v2.0 - Execution Layer (Month 2+)
- Animated compositions
- Physics simulation
- Parameter binding
- Data visualization
- State machines

---

## FILE STRUCTURE
```
/recombinatorial-demo
  /src
    /components
      Canvas.tsx                  # Main drawing surface
      RecognitionPanel.tsx        # Suggestions
      LibraryPanel.tsx            # Saved shapes
      QueryPanel.tsx              # Semantic queries (Day 6)
      DependencyTree.tsx          # Hierarchy viz (Day 6)
      LearningStats.tsx           # Stats panel (Day 7)
      
    /lib
      recognition.ts              # Day 1-5: Hardcoded recognition
      matching.ts                 # Day 4+: Composition matching
      spatial.ts                  # Day 3+: Spatial graph
      library.ts                  # Day 2+: Library management
      storage.ts                  # Day 2+: localStorage
      
      # Day 6+
      resolution.ts               # Reference resolution
      
      # Day 7
      /recognition
        core.ts                   # Recognition system
        matchers.ts               # Matcher functions
        features.ts               # Feature extractors
        learning.ts               # Learning algorithms
        persistence.ts            # Save/load profiles
      
    /types
      index.ts                    # Core types
      
    /utils
      geometry.ts                 # Bounds, distance, etc.
      stroke.ts                   # Smoothing (v1.1)
      
    App.tsx
    main.tsx
    
  package.json
  tsconfig.json
  vite.config.ts
  README.md
```

---

## CONTEXT FOR FUTURE DEVELOPMENT

### Daily Handoff Protocol

**When starting each day:**
1. Read current day's section
2. Review previous day's code
3. Run demo, verify it works
4. Ask user: "What issues from yesterday?"
5. Fix critical bugs before new features
6. Begin implementation

**When ending each day:**
1. Demo to user
2. Get feedback
3. Document bugs for tomorrow
4. Commit code
5. Update PRD if major changes

### Architecture Principles (Final State)

**Everything is resolvable:**
- No hardcoded strings for types
- All references validate
- Missing refs degrade gracefully

**Everything is weighted:**
- Connections, containment, proximity have weights
- Matching returns scores (0-1)
- Thresholds are tunable

**Everything is relational:**
- Three-tier spatial graph
- Search by relationship with weights
- Proximity is first-class

**Everything is extensible:**
- Recognition methods are data
- Matchers are pluggable
- Users add shapes → creates recognizers
- System learns over time

### Common Pitfalls to Avoid

1. **Day 1:** Don't over-engineer detection
2. **Day 2:** Don't worry about perfect matching
3. **Day 3:** Don't build full spatial graph yet
4. **Day 4:** Don't optimize too early
5. **Day 5:** Don't hardcode all compositions (just 5)
6. **Day 6:** Don't build complex resolution
7. **Day 7:** Don't over-abstract

### Critical Success Factors

**Each day must ship:**
1. ✅ Working feature (not infrastructure)
2. ✅ User can test immediately
3. ✅ Impressive in its scope
4. ✅ Stable (no crashes)

**Final v1.0 must demonstrate:**
1. ✅ Compositional intelligence
2. ✅ Multi-scale recognition
3. ✅ Semantic querying
4. ✅ Learning from use

---

## READY TO BUILD! 🚀

**Version:** 3.2 FINAL  
**Philosophy:** Ship working features daily, add complexity progressively  
**Timeline:** 7 days to v1.0, each day testable  
**Status:** Complete documentation, ready for Day 1

**First action:** Set up project, implement canvas + stroke capture + basic primitive recognition. Make it work end-to-end.

**Vision:** This demo proves that interfaces can learn user vocabularies, recognize compositional patterns in real-time, and evolve through use - making abstract concepts tangible and interactive.

Let's build this! ✨🚀

---

**END OF COMPLETE DEVELOPER DOCUMENTATION**
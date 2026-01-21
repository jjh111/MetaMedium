# MetaMedium Recognition System Strategy

## Current State Analysis

### Recognition Pipeline
```
Raw Stroke → Simplify (DP) → Fingerprint → Rule Checks → Weighted Scoring → Top Match
```

### Recognition Logic (from analyzeStrokeDetailed)
1. **Line**: straightness > 0.65, not closed, corners ≤ 2
2. **Arc**: not closed, corners ≤ 1, curved (straightness < 0.6)
3. **Triangle**: closed, 2-3 corners, aspect 0.3-3.0
4. **Rectangle**: closed, 3-4 corners, aspect 0.3-3.0
5. **Circle**: closed, corners ≤ 1, curved (straightness < 0.5)

### Root Problem: Corner Detection Failing

**Evidence from user's rectangle screenshot:**
- Detected: 2 corners (should be 4)
- Result: Misclassified as Triangle (71%)
- Straightness: 0.021 (way too low - should be ~0.6-0.7 for rectangle)

**Root Causes:**
1. `countCorners()` minimum point requirement (was 15, now 8) - still might be too high
2. Window size too large for quick strokes
3. Angle threshold (π/3 = 60°) might miss ~90° corners in hand-drawn rectangles
4. Clustering distance (20 points) might merge distinct corners

---

## Whitepaper Comparison

### Key Concepts from "Beyond Chat: Designing the Next Generation of AI Interaction"

**Pre-show Dotted Outline:**
- Before accepting, show refined geometric interpretation
- User sees "this is what I think you drew"
- Provides immediate feedback loop
- Currently missing in our implementation

**Recognition Philosophy:**
- "Forgiving recognition" - accept imperfect hand-drawn shapes
- Multi-scale matching - same shape drawn different ways should match
- Progressive refinement - raw → recognized → refined → formal
- Preserve user intent, not just geometry

**Shape Hierarchy:**
- Primitives: Circle, Line, Rectangle, Triangle
- Compositions: Built from primitives with spatial relationships
- User shapes: Learned from examples with fingerprints

---

## Proposed Strategy: Multi-Pass Recognition

### Pass 1: Geometric Heuristics (Fast Filter)
```javascript
1. Check closure (isClosed)
   ├─ YES → Closed shapes: Circle, Triangle, Rectangle
   └─ NO  → Open shapes: Line, Arc

2. For closed shapes, check curvature (straightness)
   ├─ < 0.4  → Curved (Circle candidate)
   └─ > 0.4  → Polygonal (Triangle/Rectangle candidate)

3. For polygonal, use convex hull + corner detection
   ├─ 3 vertices → Triangle
   └─ 4 vertices → Rectangle
```

### Pass 2: Geometric Fitting (Validation)
```javascript
- Circle: Fit least-squares circle, check residual error
- Rectangle: Fit bounding box, check corner alignment
- Triangle: Fit convex hull, validate 3-vertex structure
- Line: Fit least-squares line, check deviation
```

### Pass 3: Scoring & Ranking
```javascript
- Score each candidate on:
  * Geometric fit quality (residual error)
  * Feature match (corners, straightness, closure)
  * Confidence threshold
- Return top 3 matches with scores
```

---

## Improved Corner Detection Strategy

### Option A: Convex Hull + Corner Finding (Recommended)
```javascript
function detectCornersRobust(points) {
    // 1. Compute convex hull (removes noise, finds outer boundary)
    const hull = convexHull(simplifyStroke(points, 1.5));

    // 2. Find corners on hull using angle analysis
    const corners = [];
    for (let i = 0; i < hull.length; i++) {
        const angle = angleBetween(hull[i-1], hull[i], hull[i+1]);
        if (angle < 160°) { // Sharp turn = corner
            corners.push({point: hull[i], angle});
        }
    }

    // 3. Return sharpest N corners
    return corners.sort(by sharpness).take(4);
}
```

**Benefits:**
- Robust to noise and hand-drawing variations
- Works with any stroke length
- Naturally finds 3-4 corners for polygons
- Already have convexHull implementation

### Option B: Douglas-Peucker + Angle Analysis
```javascript
function detectCornersDP(points) {
    // 1. Aggressively simplify to key vertices
    const simplified = douglasPeucker(points, tolerance=5);

    // 2. Count vertices = corners
    return simplified.length;
}
```

**Benefits:**
- Simple and fast
- DP naturally finds salient vertices
- Already implemented

**Recommendation:** Use Option A (Convex Hull) for closed shapes, Option B (DP) for open shapes

---

## UX Improvements

### 1. Stroke Visualization under Fingerprint
```
FINGERPRINT DATA                        ▼
┌──────────────────────────────────────┐
│  [Stroke Preview Canvas - 100x100]  │
│   Shows simplified stroke in gray    │
│   With detected corners marked       │
└──────────────────────────────────────┘
STRAIGHTNESS    ASPECT
0.021           1.259
```

### 2. Pre-show Dotted Outline (Whitepaper Feature)
```javascript
// On mouseup, before accepting:
1. Detect shape → "Rectangle"
2. Fit geometric primitive → {corners: [p1,p2,p3,p4]}
3. Draw dotted outline overlay
4. Show "Accept as Rectangle?" prompt
5. User clicks Yes → Replace stroke with formal shape
```

**Visual:**
```
[User's wobbly rectangle]
[Dotted perfect rectangle overlay]
"This looks like a Rectangle. Accept?"
[Yes] [No, try again] [Something else...]
```

---

## Action Plan (Priority Order)

### Phase 1: Fix Corner Detection (Critical)
- [ ] Implement convex hull corner detection
- [ ] Lower angle threshold from 60° to 120° for rectangles
- [ ] Test with various stroke speeds and sizes
- [ ] Add debug visualization of detected corners

### Phase 2: Improve Straightness Calculation
- [ ] Use simplified stroke (already done)
- [ ] Consider using DP-simplified vertex count as proxy
- [ ] Normalize by stroke length

### Phase 3: Add Stroke Visualization
- [ ] Add small canvas under "FINGERPRINT DATA"
- [ ] Draw simplified stroke in gray
- [ ] Mark detected corners with red dots
- [ ] Show convex hull outline

### Phase 4: Implement Pre-show Dotted Outline
- [ ] Create geometric refinement for each shape
- [ ] Draw dotted overlay on recognition
- [ ] Add accept/reject UI
- [ ] Smooth transition to accepted shape

### Phase 5: Weighted Scoring Tuning
- [ ] Adjust score weights based on testing
- [ ] Add shape-specific bonus features
- [ ] Implement confidence thresholds

---

## Testing Strategy

### Test Cases for Each Shape
1. **Circle**: Slow perfect, fast wobbly, elliptical
2. **Rectangle**: Horizontal, vertical, square, various speeds
3. **Triangle**: Equilateral, right, obtuse, upside-down
4. **Line**: Horizontal, vertical, diagonal, short, long

### Success Criteria
- 95%+ accuracy on slow/careful drawings
- 85%+ accuracy on fast/casual drawings
- No false negatives (should always suggest something)
- Top match correct 90%+ of the time

---

## Implementation Notes

### Keep Simple
- Don't over-engineer early
- Use existing convexHull and douglasPeucker functions
- Tune thresholds empirically with real testing
- Add complexity only when needed

### Preserve Intent
- User's stroke is canonical - never destroy it
- Geometric refinement is optional (accept/reject)
- Show confidence levels to user
- Allow manual override ("Something else...")

### Performance
- Target: <50ms recognition time
- Cache fingerprints
- Lazy compute geometric fits only for top candidates
- Use WebWorker for heavy computation if needed

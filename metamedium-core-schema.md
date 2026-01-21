# MetaMedium Core Engine Schema

## Design Principles

### No-Modes Philosophy
Type is not assigned. Type EMERGES from connections.
A drawn circle doesn't "have type = circle". It CONNECTS TO the circle concept.
This means the same mark can simultaneously be:
- A stroke (connected to its points)
- A circle (connected to circle-type)
- An entity (connected to "fox")
- A symbol (connected to "wholeness")

### The Skeleton Paradox
We reject modes, but we need vocabulary.
Resolution: The vocabulary items are ALSO nodes.
They're not privileged—they're just nodes that many other nodes connect to.
We bootstrap with a set of "primitive" nodes, but users can add more.

---

## Research Grounding

### Scene Graphs (Visual Genome, Neural Motifs)
```
⟨object⟩ —predicate→ ⟨object⟩
```
- Objects: bounding box + label + attributes
- Relations: spatial, action, comparative
- **Insight**: Explicit relation nodes, not just edges

### Image Schemas (Lakoff/Johnson, Mandler)
Recurring patterns from embodied experience:
| Schema | Structure | Examples |
|--------|-----------|----------|
| CONTAINER | inside/outside/boundary | "in the box", "out of mind" |
| SOURCE-PATH-GOAL | origin → trajectory → destination | "go from X to Y" |
| LINK | connection between entities | "connected", "attached" |
| FORCE | push/pull/block/enable | "forced to", "prevented" |
| SCALE | more/less, big/small | "bigger than" |
| PART-WHOLE | component/aggregate | "part of", "made of" |
| CENTER-PERIPHERY | core/margin | "central idea" |
| CYCLE | return to origin | "again", "recurrence" |

**Insight**: These are the primitive spatial concepts that ground abstract thought.

### Construction Grammar (Goldberg)
Form-meaning pairings at every scale:
- Morpheme: "un-" = negation
- Word: "kick" = strike-with-foot
- Phrase: "X gives Y Z" = transfer-possession
- Clause: entire argument structure

**Insight**: Constructions are nodes too. "X verbs Y" is a template node.

### Compositional Generative Models (Lake et al., BPL)
```
concept = program(primitives)
character = strokes(parts(sub-strokes))
```
**Insight**: Hierarchical composition. Everything is made of things.

### Frame Semantics (FrameNet)
Frames = schematic situations with roles:
```
COMMERCE_BUY
  - Buyer (who pays)
  - Seller (who receives payment)  
  - Goods (what transfers)
  - Money (what buyer gives)
```
**Insight**: Predicates evoke frames. "Buy" opens slots for buyer, seller, goods.

### Knowledge Representation (RDF, OWL)
```turtle
:fox rdf:type :Animal .
:fox :hasColor :brown .
:fox :performs :jumping .
:jumping :over :dog .
```
**Insight**: Reification. Relations can be subjects of other relations.

---

## Core Schema

### Node (Universal Structure)

```typescript
interface Node {
  id: string;                    // Unique identifier
  
  // === PERCEPTUAL GROUND ===
  stroke?: {
    points: Point[];             // Raw input
    derived: StrokeDerived;      // Computed properties
  };
  
  // === REPRESENTATIONS ===
  // Multiple simultaneous modalities (no primary)
  reps: Representation[];
  
  // === CONNECTIONS ===
  // Just links. Meaning emerges from what you connect to.
  edges: Edge[];
}

interface Point {
  x: number;
  y: number;
  t?: number;                    // Timestamp
  p?: number;                    // Pressure
}

interface StrokeDerived {
  // Geometry
  bbox: { x, y, w, h };
  center: { x, y };
  area: number;                  // If closed
  pathLength: number;
  
  // Shape properties
  isClosed: boolean;
  curvature: number[];           // At each point
  corners: number[];             // Indices of corners
  
  // Dynamics (if temporal)
  velocity: number[];
  acceleration: number[];
  
  // Gestalt
  symmetry?: { axis, score };
  complexity: number;            // Stroke count, intersection count
}

interface Representation {
  modality: Modality;
  data: any;                     // Interpreted by modality
  confidence?: number;           // For recognized/inferred reps
}

type Modality = 
  | 'stroke'      // Visual: the raw points
  | 'shape'       // Visual: recognized primitive { type, params }
  | 'word'        // Linguistic: string
  | 'math'        // Symbolic: { latex, params }
  | 'frame'       // Semantic: { frameType, roles }
  | 'sound'       // Auditory: { waveform } or { pitch, duration }
  | 'meta'        // System: { isType, isRelation, ... }
  ;

interface Edge {
  to: string;                    // Target node ID
  weight?: number;               // Connection strength (0-1)
  via?: string;                  // Relation node ID (reification)
}
```

---

## Relation Taxonomy

Relations are nodes. They live in a hierarchy (via edges to parent relations).
Here's the bootstrap vocabulary:

### 1. SPATIAL RELATIONS
Grounded in visual/physical perception of the canvas.

```
spatial
├── proximity
│   ├── touching        // Strokes intersect or share points
│   ├── near            // Within threshold distance
│   ├── far             // Beyond threshold
│   └── overlapping     // Bboxes intersect
│
├── containment
│   ├── inside          // A's bbox within B's bbox, B is closed
│   ├── outside         // Not inside
│   ├── surrounds       // Inverse of inside
│   └── encloses        // Closed stroke around open strokes
│
├── direction
│   ├── above           // A.center.y < B.center.y
│   ├── below
│   ├── left-of
│   ├── right-of
│   └── between         // A is between B and C
│
└── alignment
    ├── parallel        // Similar stroke direction
    ├── perpendicular   // Orthogonal directions
    └── aligned         // Centers on same axis
```

**Detection**: Computed from stroke geometry. No labeling required.

### 2. STRUCTURAL RELATIONS
How things compose.

```
structural
├── composition
│   ├── part-of         // A is component of B
│   ├── has-part        // Inverse
│   ├── made-of         // Material composition
│   └── contains        // B has A inside (non-spatial sense)
│
├── grouping
│   ├── group           // Collection node
│   ├── member-of       // Element of group
│   └── sequence        // Ordered group
│
├── typing
│   ├── instance-of     // A is example of B
│   └── subtype-of      // A is specialization of B
│
└── reference
    ├── same-as         // Co-reference
    ├── represents      // A stands for B
    └── depicts         // A visually shows B
```

**Detection**: 
- `part-of`: Inferred from containment + labeling
- `instance-of`: Connection to type nodes
- `sequence`: Temporal order of drawing OR spatial arrangement

### 3. FORCE-DYNAMIC RELATIONS  
Based on Talmy's force dynamics and image schemas.

```
force-dynamic
├── source-path-goal
│   ├── from            // Origin of motion
│   ├── through         // Intermediate
│   └── to              // Destination
│
├── causation
│   ├── causes          // A brings about B
│   ├── enables         // A makes B possible
│   ├── prevents        // A stops B
│   └── despite         // B happens though A opposes
│
├── agency
│   ├── agent           // Initiator of action
│   ├── patient         // Affected by action
│   ├── instrument      // Tool used
│   └── experiencer     // Mental state holder
│
└── force
    ├── pushes
    ├── pulls
    ├── supports
    └── blocks
```

**Detection**:
- Arrows → source-path-goal
- Verbs evoke frames → agent/patient
- Physical simulation for force?

### 4. CONCEPTUAL RELATIONS
Abstract semantic connections.

```
conceptual
├── taxonomic
│   ├── is-a            // Hyponymy (dog is-a animal)
│   ├── has-property    // Attribution
│   └── has-role        // Function (key has-role opener)
│
├── associative
│   ├── similar-to      // Resemblance
│   ├── opposite-of     // Antonymy
│   ├── related-to      // General association
│   └── example-of      // Illustration
│
├── logical
│   ├── entails         // A → B necessarily
│   ├── contradicts     // A → ¬B
│   ├── compatible      // A ∧ B possible
│   └── independent     // No logical connection
│
└── mereological
    ├── overlaps        // Share parts
    ├── disjoint        // No shared parts
    └── complements     // Together form whole
```

**Detection**: Requires world knowledge or user assertion.

### 5. TEMPORAL RELATIONS
Time-based connections (Allen's interval algebra).

```
temporal
├── sequence
│   ├── before          // A ends before B starts
│   ├── after           // B ends before A starts
│   ├── meets           // A ends exactly when B starts
│   └── during          // A contained within B's span
│
├── simultaneity
│   ├── co-occurs       // Same time
│   ├── overlaps        // Partial temporal overlap
│   └── starts-with     // Same start time
│
└── frequency
    ├── once
    ├── repeated
    └── continuous
```

**Detection**:
- Drawing order provides default sequence
- Explicit timeline if present

### 6. EPISTEMIC RELATIONS
Knowledge states and attitudes.

```
epistemic
├── belief
│   ├── believes        // X holds P true
│   ├── knows           // X has justified true belief P
│   ├── doubts          // X uncertain about P
│   └── imagines        // X entertains P as fiction
│
├── intention
│   ├── wants           // X desires P
│   ├── intends         // X plans to bring about P
│   ├── tries           // X attempts P
│   └── avoids          // X acts to prevent P
│
└── modality
    ├── possible        // P could be true
    ├── necessary       // P must be true
    ├── impossible      // P cannot be true
    └── contingent      // P depends on conditions
```

**Detection**: Language-triggered. "X wants Y" creates epistemic edge.

---

## What Gets Tracked

### At Stroke Creation
```typescript
// Immediate (during drawing)
- points[]                    // x, y, t, p
- instantaneous velocity
- drawing order (global index)

// On stroke complete
- bbox, center, area
- isClosed
- pathLength
- curvature[], corners[]

// Gestalt analysis
- spatial relations to existing strokes
- containment (what's it inside? what's inside it?)
- proximity (what's nearby?)
- intersection (what does it cross?)
```

### At Recognition
```typescript
// Shape recognition (parallel, multi-hypothesis)
- circle fit: { h, k, r, error }
- line fit: { m, b, error } or { θ, ρ, error }
- rectangle fit: { x, y, w, h, θ, error }
- arrow fit: { from, to, headType, error }
- freeform: { complexity, symmetry }

// Create edges to matching shape-type nodes
// Weighted by inverse error (confidence)
```

### At Labeling
```typescript
// User provides word
- Add 'word' representation
- Lookup in lexicon → add edges to concept nodes
- If verb → evoke frame, expect arguments

// Or: Infer from context
- Shape + position suggests label
- Connected nodes suggest label
```

### At Sentence Generation
```typescript
// Traverse graph
- Find entities (high-degree nodes with labels)
- Find relations connecting them
- Find attributes (low-degree nodes attached to entities)

// Linearize
- Apply templates from construction grammar
- Respect information structure (given/new)
- Generate surface string
```

---

## Bootstrap Nodes

The system starts with these nodes pre-loaded.
They're not privileged—just nodes that define vocabulary.

```typescript
const BOOTSTRAP = {
  // Shape types
  'type:stroke': { reps: [{ modality: 'word', data: 'stroke' }], meta: { isType: true }},
  'type:circle': { reps: [{ modality: 'word', data: 'circle' }, { modality: 'math', data: 'x²+y²=r²' }], meta: { isType: true }},
  'type:line': { reps: [{ modality: 'word', data: 'line' }, { modality: 'math', data: 'y=mx+b' }], meta: { isType: true }},
  'type:arrow': { reps: [{ modality: 'word', data: 'arrow' }], meta: { isType: true }},
  'type:rectangle': { reps: [{ modality: 'word', data: 'rectangle' }], meta: { isType: true }},
  
  // Relation types (see taxonomy above)
  'rel:inside': { reps: [{ modality: 'word', data: 'inside' }], meta: { isRelation: true, category: 'spatial' }},
  'rel:above': { reps: [{ modality: 'word', data: 'above' }], meta: { isRelation: true, category: 'spatial' }},
  // ... etc
  
  // Image schemas
  'schema:container': { reps: [{ modality: 'word', data: 'container' }], meta: { isSchema: true }},
  'schema:source-path-goal': { reps: [{ modality: 'word', data: 'source-path-goal' }], meta: { isSchema: true }},
  // ... etc
  
  // Common concepts (optional, can be user-added)
  'concept:entity': { reps: [{ modality: 'word', data: 'entity' }], meta: { isType: true }},
  'concept:action': { reps: [{ modality: 'word', data: 'action' }], meta: { isType: true }},
  'concept:property': { reps: [{ modality: 'word', data: 'property' }], meta: { isType: true }},
};
```

---

## Query Patterns

### "What is this stroke?"
```typescript
function whatIs(node: Node): string[] {
  return node.edges
    .filter(e => {
      const target = getNode(e.to);
      return target?.meta?.isType;
    })
    .map(e => getNode(e.to).reps.find(r => r.modality === 'word')?.data)
    .filter(Boolean);
}
// Returns: ["stroke", "circle", "entity", "fox"]
```

### "What relates A to B?"
```typescript
function relatedHow(a: Node, b: Node): Node[] {
  // Find relation nodes that connect to both A and B
  return [...nodes.values()].filter(n => 
    n.meta?.isRelation &&
    n.edges.some(e => e.to === a.id) &&
    n.edges.some(e => e.to === b.id)
  );
}
// Returns: [{ word: "jumps over", edges: [fox, dog] }]
```

### "What's inside this?"
```typescript
function inside(container: Node): Node[] {
  return [...nodes.values()].filter(n =>
    n.edges.some(e => 
      e.to === container.id && 
      e.via && getNode(e.via)?.id === 'rel:inside'
    )
  );
}
```

### "Generate sentence"
```typescript
function toSentence(root: Node): string {
  // Find all entities connected to root
  // For each pair with a relation, generate clause
  // Combine with conjunctions
  // This is where construction grammar templates apply
}
```

---

## Open Questions

1. **Edge direction**: Is `A --inside--> B` "A is inside B" or "B contains A"? 
   - Option: Edges are directed, convention is subject→object
   - Option: Relations are nodes, order determined by role slots

2. **Confidence decay**: Do old interpretations fade? 
   - If I drew something as circle but later it becomes part of a face, does circle-connection weaken?

3. **Inference**: When do we auto-add edges?
   - Spatial relations: Always compute from geometry
   - Conceptual relations: Only when asserted?
   - Transitive closure: If A is-a B and B is-a C, add A is-a C?

4. **Negation**: How to represent "not inside", "doesn't want"?
   - Option: Negation node that wraps relation
   - Option: Negative edge weight
   - Option: Separate negative-relation type

5. **Quantification**: "All circles are closed" vs "This circle is closed"
   - Type-level assertions vs instance-level
   - May need meta-edges on type nodes

---

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         THE CORE INSIGHT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Everything is a node.                                          │
│   Types are nodes.                                               │
│   Relations are nodes.                                           │
│   Schemas are nodes.                                             │
│                                                                  │
│   What something IS = what it connects to.                       │
│   A mark becomes meaningful through its connections.             │
│                                                                  │
│   The "discrete skeleton" of concepts is just                    │
│   a set of well-connected nodes that many things link to.        │
│   It's not privileged—it's just popular.                         │
│                                                                  │
│   New concepts = new nodes = new things to connect to.           │
│   The vocabulary grows with use.                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

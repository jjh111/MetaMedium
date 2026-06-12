# MetaMedium v6: The Session Engine

**Status:** Active design — being implemented in `metamedium-core/`
**Date:** June 2026
**Lineage:** Adopts the node model from `metamedium-core-schema.md`; adopts and amends
`ARCHITECTURE-v5-UNIFIED-ENGINE.md`; supersedes the selection-gesture section of
`PRD-v4-LLM-Grounded.md`. Read those for background; read **this** to build.

This document crystallizes the design conversation of June 2026. It is written
to be sufficient on its own: a future contributor (human or AI, any model)
should be able to build correctly from this document plus the test suite,
without reconstructing the reasoning.

---

## 1. The User Story (the thing being built)

> Doodle out a diagram. Circle it. Do the check gesture. A contextual offer
> appears — name it, accept a match, or just keep drawing. The named thing is
> now an **artifact**: it persists in the canvas, moves as a unit, is
> recognized when drawn again, and composes into bigger artifacts.

No tool palettes, no selection mode, no save dialog. Just doodling, with the
system holding interpretations until the user commits one — or doesn't.

The canonical loop (from CLAUDE.md) is the acceptance test: draw circle → save
as "bubble" → draw 3 bubbles + 2 lines → save as "molecule" → system
recognizes "molecule" automatically → ask "why?" → grounded reasoning.

---

## 2. Principles (decided, with rationale)

1. **Every activity is valid — including nothing.** There is no state in which
   input is refused or required. Ignoring a suggestion is an answer. An
   unresolved ambiguity is a legitimate permanent state.
2. **No modes; multi-parse and hold ambiguity.** Strokes are never interpreted
   at draw time. They are *evidence*. Every stroke/cluster carries a ranked
   candidate list that is never auto-committed and always revisable.
3. **Deferred commitment with retroactivity.** Later events reinterpret
   earlier strokes. A circle around three shapes is simultaneously content
   (a drawn circle, with candidates) and a gesture candidate (a lasso). The
   *next event* resolves it: a check arrives → it was a gesture, retroactively
   lifted off the content plane; anything else arrives → it stays content.
4. **Temporal + contextual resolution, never pure time-gating.** Time windows
   alone never decide anything. Resolution combines recency *and* context
   (what a stroke encloses, what it touches, what followed it).
5. **Summoning, not confirming.** The check gesture *summons* the context
   (suggestions, actions); it does not itself accept anything. Acceptance is
   a separate, explicit act (choosing a suggestion, providing a name). This
   is the whitepaper's turn-taking pattern: machine offers, human disposes.
6. **Keep the ink, surface the refined.** Raw strokes are the perceptual
   ground truth and are never destroyed or replaced. Refined geometry, names,
   and payloads are *additional representations* on the same node. What gets
   *displayed* is the renderer's choice — this is an engine contract, not a
   styling preference. (This is a dev tool, not a doodle aesthetic.)
7. **Context is everything.** The enclosure of a lasso defines the parse
   scope. Proximity defines clusters. Spatial relationships define
   composition. Capability escalation (see §7) is also contextual.
8. **Inferred, then blessed.** Relationships (recognitions, groupings, wires)
   are inferred cheaply and held as candidates; a human gesture blesses them
   into commitments. Blessed ≠ frozen:
9. **Nothing is sacred, because everything is.** Any commitment is
   reconfigurable. Blessing raises the standing of an interpretation; it does
   not delete the alternatives or the evidence.

---

## 3. The Promotion Ladder

Everything in the canvas climbs (and can descend) one ladder:

```
ink → cluster → candidate → artifact → interactive artifact → container
```

- **ink** — raw stroke, held with its fingerprint and candidate list
- **cluster** — automatic spatial grouping (proximity); no user action involved
- **candidate** — a cluster (or stroke) that matches something known, with confidence
- **artifact** — a *blessed* unit: named (or matched), persistent, opaque from
  outside / transparent within, participates in the graph as one node
- **interactive artifact** — an artifact whose node carries a renderable
  payload representation (html/markdown/svg)
- **container** — an artifact whose payload can compute, at a granted
  capability tier (§7)

Each promotion uses the same mechanism: select (lasso) → summon (check) →
bless (name / accept / grant). One UX, every rung.

**Demotion:** if a member of an artifact is removed (undo, delete), the
artifact degrades to a cluster with a visible "broken" status — never a
silent phantom.

---

## 4. Data Model: Everything Is a Node

Adopted from `metamedium-core-schema.md`, now load-bearing. The artifact is
**not** a `{strokes, shape, name}` record — it is a node with an open list of
representations. This is the single most consequential implementation
decision: it is what lets the same structure carry ink today and executable
payloads later without a rewrite.

```typescript
interface MMNode {
  id: string;
  reps: Rep[];          // open list — meaning accretes as representations
  edges: Edge[];        // meaning emerges from connections
  capability: 0 | 1 | 2 | 3;   // §7; everything starts at 0
  createdAt: number;
}

interface Rep {
  modality: string;     // 'stroke' | 'fingerprint' | 'word' | 'refined' |
                        // 'gesture' | 'html' | 'script' | ... (open set)
  data: unknown;
  confidence?: number;
  source?: string;      // provenance: 'heuristic' | 'user' | 'llm:<model>' | ...
}

interface Edge {
  to: string;           // target node id
  rel: string;          // 'resembles' | 'instance-of' | 'part-of' | 'encloses' |
                        // 'touching' | 'intersecting' | 'contains' | 'connects' | ...
  weight?: number;      // confidence for inferred edges
  blessed?: boolean;    // inferred (false/absent) vs blessed (true)
  via?: string;         // reification: relation-as-node, when needed
}
```

Concretely:
- A **stroke** is a node with a `stroke` rep (points + timestamps) and a
  `fingerprint` rep. Recognition adds `resembles` edges to type nodes
  (circle, line, …) with weights. Multi-parse = multiple `resembles` edges.
- A **gesture** is the same stroke node, retroactively given a `gesture` rep.
  Its content edges remain (provenance) but content queries exclude it.
- An **artifact** is a new node with `part-of` edges from its members, a
  `word` rep (its name), optionally an `instance-of` edge to another artifact,
  and the blessing gesture kept as provenance (`via`).
- **Types are nodes too** (bootstrap: circle, line, rectangle, triangle, arc).
  Not privileged — just well-connected.
- A **wire** is an inferred `connects` edge (a line whose endpoints touch two
  nodes), held unblessed until the summon flow confirms it.

---

## 5. The Session Engine

A headless, framework-free, renderer-agnostic state machine in
`metamedium-core/src/session/`. Surfaces (React app, standalone canvas,
the iframe playground) feed it events and render its state. **The engine
never blocks input and never renders.**

### Events in

```typescript
session.addStroke(points: Point[], at: number)   // the only required input
session.tick(at: number)                          // host-driven time signal
session.bless(blessing)                           // accept suggestion / name / grant
session.dismiss(summonId)                         // explicit dismissal (optional —
                                                  // drawing past a summon also dissolves it)
```

All inputs are appended to an event log (the session is replayable; undo is
"drop last event and replay" — deferred to v0.2 but the log exists from day 1).

### State out

```typescript
interface SessionState {
  nodes: Map<string, MMNode>;
  contentIds: string[];          // stroke/artifact nodes on the content plane
  pendingLassoId: string | null; // stroke currently held as gesture-candidate
  summon: Summon | null;         // at most one active
  clusterCandidates: ClusterCandidate[]; // clusters matching known artifacts
  artifacts: string[];           // blessed artifact node ids
}

interface Summon {
  id: string;
  enclosedIds: string[];         // the parse scope the lasso defined
  suggestions: Suggestion[];     // ranked: matches first, then "name as new"
  gestureIds: string[];          // the lasso + check strokes (provenance)
}
```

### Resolution rules (the heart of it)

On `addStroke`:

1. Create the stroke node; compute fingerprint; add `resembles` edges from
   heuristic recognition (multi-parse: all candidates kept, ranked).
2. Update spatial edges against existing content nodes (touching /
   intersecting / contains — from `buildSpatialGraph` semantics).
3. **Gesture evaluation, before content commitment:**
   - If there is a `pendingLasso` and the new stroke is *check-like*
     (open, 1–2 corners, small relative to the lasso) **and** near or
     intersecting the lasso **and** within the temporal window →
     **retroactive resolution**: both strokes get `gesture` reps, leave the
     content plane, and a Summon is emitted over the lasso's enclosed nodes.
   - Otherwise, if a summon is active, it dissolves (drawing past it is
     dismissal — principle 1).
   - If the new stroke is *lasso-like* (closed-ish **and** encloses ≥ 1
     content node — context, not just shape) it becomes the new
     `pendingLasso` *while also* receiving normal content candidates
     (principle 3: it is both, until resolved).
4. Recompute cluster candidates: spatial clusters of content nodes matched
   against known artifact signatures (v0.1: component-type histogram; the
   richer `CompositionFingerprint` machinery exists in the legacy code and
   slots in here later).

The temporal window for check-after-lasso is a constant (~4s) **combined
with** the spatial condition — neither alone suffices (principle 4). A
pending lasso that never gets its check simply remains content; nothing
expires it into an error.

### What the engine deliberately does not know

Rendering, sanitization, sandboxing, HTML, voice, LLMs. LLM tiers attach
later as **async candidate sources**: they receive the same grounded substrate
(fingerprints, spatial edges, library context) and return additional
`resembles`/`connects` edges with `source: 'llm:…'` — feeding the same
multi-parse state, never gating input (CLAUDE.md pitfall #2).

---

## 6. Gesture Grammar v0.1

| Gesture | Form | Meaning |
|---|---|---|
| **Lasso** | closed-ish stroke enclosing ≥1 content node | proposes a parse scope (held ambiguous) |
| **Check** | open stroke, 1–2 corners, small, near/over a pending lasso, soon after | resolves the lasso as gesture; **summons** |

Deferred, by design: single-stroke circle-with-check-tail (PRD-v4's variant —
add once two-stroke works), scribble-erase, written-name-as-label (write a
word next to a summon; the word-stroke parses to a `word` rep and binds by
proximity — the most on-thesis naming channel, after handwriting recognition
exists), voice naming (metadoodle1 has the plumbing).

Renderer guidance (not engine logic): the moment a gesture resolves, show it —
tint the lasso gold/translucent. Misreads become visible instantly, and "keep
as drawing" is one of the summoned suggestions. Computational theater is the
disambiguation UI.

---

## 7. Capability Tiers & Containers (the horizon this is built toward)

The container insight: an artifact's payload can be data, interface, or
computation — and **capability is granted through the same bless flow**, so
the security model and the UX are one mechanism. A blob is never asked what
it is up front; it sits inert until context + explicit gesture escalate it.

| Tier | Grants | Host implementation (not engine) |
|---|---|---|
| 0 | inert data — render as ink/thumbnail only | nothing to do |
| 1 | declarative presentation (sanitized HTML/SVG/markdown) | sanitizer |
| 2 | sandboxed computation, message-passing only | worker / sandboxed iframe |
| 3 | trusted module, full access | deliberate, rare |

The iframe playground is the Tier-2 host, already half-built. The engine's
entire involvement: `capability` on the node, payload reps, and bless events
that raise the tier. **First concrete escalation to build (after v0.1):**
draw a rectangle → lasso+check → "make this a surface" → drop markdown in →
renders at Tier 1 within the bounds → still a node: lassoable, nameable,
composable.

**Recombination** rides the spatial graph the parser already builds:
containment = embedding, line between artifacts = candidate wire (`connects`,
inferred-then-blessed), proximity = shared context. The drawing grammar *is*
the wiring grammar — no separate node-and-wire editor.

---

## 8. Executable Spec

The scenario test `metamedium-core/src/session/session.scenario.test.ts`
encodes the user story end-to-end with synthetic strokes (draw molecule parts
→ lasso → check → summon → bless "molecule" → redraw elsewhere → candidate
appears → ink preserved throughout). **That test is the contract.** Change it
knowingly or not at all; build UIs against the behavior it locks down.

Unit suites alongside it cover geometry, recognition, spatial, and gesture
detection. CI runs all of it on every push/PR.

---

## 9. Amendments to Prior Documents

- **ARCH-v5 "parse state is ephemeral, dies when interaction ends":** amended.
  Provisional interpretation must survive across strokes (the lasso awaits its
  check). The session engine *is* that provisional plane, with resolution
  rules instead of expiry.
- **PRD-v4 selection gesture = "select and confirm" atomically:** amended to
  summon-only (principle 5). PRD-v4's detection heuristics remain the basis
  for check detection.
- **ARCH-v5 MoE router / embedding space:** still deferred (ROADMAP.md). The
  `resembles`-edge model is forward-compatible with both.

## 10. Build Sequencing & Anti-Goals

**v0.1 (now):** package scaffold; geometry/recognition/spatial ported from
Web App Skeleton with tests; node store; session engine with lasso+check →
summon → bless; histogram artifact matching; scenario test; CI.
**v0.2:** replay-based undo + artifact degradation; wire (`connects`)
inference + blessing; richer composition matching (port
`CompositionFingerprint`); UMD bundle for standalone demos.
**v0.3:** first Tier-1 container escalation; playground surface wiring;
Web App Skeleton converges onto the package.

**Anti-goals for now:** no UI in the core, no LLM calls in the core, no
embedding space, no MoE, no general plugin system, no sanitizer/sandbox in
the core (host concerns). Don't build the container *system* — build one
escalation, then generalize from evidence.

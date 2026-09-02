# The Three Keyframes

**Date:** August 2026
**Status:** **Built** (all six stages). What each stage found is recorded under it.
**Relationship to other docs:** `MVP.md` is the product; this is the next sprint
inside it. It absorbs and narrows the open-ended concept library added on 20 Aug.

---

## 1. Why narrow now

The concept library was built open-ended: a name, a predicate over relations, and
whatever conversions seemed to fit. That is the right *end state* and the wrong
*starting point*, because nothing constrains it. Any pattern can be a concept,
any conversion can hang off it, and there is no way to tell whether the library
is finished, correct, or good — only whether it happens to fire on the drawing in
front of you. Open-endedness with no anchor is slippery in exactly the way that
makes a system impossible to finish.

So: **three keyframes, each with a closed vocabulary.**

```
    stroke  ──▸  SHAPE  ──▸  DIAGRAM-SHAPE  ──▸  CODE
      ink        what it is    what it plays     what it becomes
```

A closed vocabulary at each rung buys four things the open version cannot:

- **It can be enumerated.** You can read the whole thing on one screen and say
  whether it is right.
- **It can be tested exhaustively** — every shape against every role, every role
  against every code target, rather than spot-checks on whatever was drawn.
- **The mappings become the artifact.** "shape + context → role" is a table you
  can review and argue with, not a predicate buried in a function.
- **It fails visibly.** A mark with no role is *unclassified*, which is a thing
  the canvas can say out loud, rather than a silent gap.

Open-endedness comes back later as **additions to a vocabulary**, not as a
different mechanism. That is the whole point of fixing the rungs first.

---

## 2. What each rung is

### Rung 1 — SHAPE: what the stroke is

Geometry alone. No context, no neighbours. **Built and benchmarked** (99.9% over
1080 hand-drawn strokes), but three entries are missing, and each blocks the
rung above it:

| shape | status | why it matters |
|---|---|---|
| `rectangle` `circle` `triangle` `line` `arc` | ✅ built | the current vocabulary |
| **`arrow`** | ✅ 100% | **without it an edge has no direction**, and a flow is just a graph |
| **`text`** | ✅ 99% | **without it a label is indistinguishable from a box**, so every scribble in a box reads as structure |
| **`dot`** | ✅ 100% | a point, a bullet, a terminus — below the hand's resolution only `dot` is offered |

**`text` does not mean readable.** Knowing *"there is writing here"* is enough to
assign the `label` role, and it is a far cheaper thing to detect than what the
writing says. That decoupling is deliberate: handwriting recognition (v7 Stage E)
becomes an upgrade to a rung that already works, rather than a prerequisite for
it.

### Rung 2 — DIAGRAM-SHAPE: what the mark plays

Shape **plus relations**. This is the rung that does not exist yet, and it is the
missing link between "I see a rectangle" and "I can write a div".

| role | what it is |
|---|---|
| `container` | a closed mark enclosing others |
| `node` | a closed mark that is a thing in its own right |
| `edge` | a line or arrow joining two marks |
| `label` | writing that belongs to another mark |
| `annotation` | a mark that relates to nothing — a note in the margin |
| `unclassified` | *said out loud, not hidden* |

Six entries. That is the whole vocabulary, and the constraint is the feature.

### Rung 3 — CODE: what it becomes

Already built for one case (layout → flexbox, at zero drift). The rung is
incomplete because it assumes every drawing is a page. **A drawing has a genre**,
and the genre chooses the code target:

| genre | when | target |
|---|---|---|
| `layout` | containers and nodes tiling a space, no edges | flexbox scaffold ✅ built |
| `graph` | ≥2 nodes joined by ≥1 edge | nodes + SVG connectors following the ink ✅ built |
| `mixed` | both | layout outer, graph within a container |

---

## 3. The mapping, as a table

This table *is* the library. It lives in one file, it is read top to bottom, and
the first row that matches wins.

| # | shape | context | → role |
|---|---|---|---|
| 1 | closed | contains ≥1 mark | `container` |
| 2 | `text` or `dot` | inside a closed mark | `label` of it |
| 3 | `text` | near a mark, not inside | `label` of it (a caption) |
| 4 | `arrow` | both ends engage marks | `edge`, directed |
| 5 | `line` | both ends engage marks | `edge`, undirected |
| 6 | `arrow`/`line` | one end engages a mark | `annotation` (a pointer) |
| 7 | closed | anything else | `node` |
| 8 | anything open | engages nothing (`near`/`touching`/`crossing`/`contains`) | `annotation` |
| 9 | — | no rule matched | `unclassified` |

And the second mapping, role → code, chosen by genre:

| role | in `layout` | in `graph` |
|---|---|---|
| `container` | a flow element (`<section>`, flex row/column) | a subgraph boundary |
| `node` | a content element, filled by the model | a positioned node element |
| `edge` | *nothing* — it was structure, not content | an SVG connector along the drawn path |
| `label` | the text content of its parent | the node's or edge's caption |
| `annotation` | an aside, kept out of the flow | a floating note |
| `unclassified` | rendered as ink only, and reported | same |

Two properties worth stating because they are easy to lose:

- **Every rung keeps the one below it.** A mark is a stroke *and* a rectangle
  *and* a container *and* a `<section>`. The ladder is additive, so "why?" can
  walk down it, and a wrong reading at the top does not destroy the bottom.
- **Multi-parse survives.** A mark can hold competing roles the way it holds
  competing shapes, ranked, with nothing silencing anything else
  (ARCHITECTURE-v6 principle 2).

---

## 4. The sprint

Six stages. Each ends with something you can look at.

### Stage 1 — Finish the shape rung  ·  ✅ built
Add `arrow`, `text`, `dot` to `src/recognition.ts`, and extend the hand-drawn
corpus in `src/test/cases.ts` to cover them.

- `arrow`: a mostly-straight stroke with a sharp back-turn near one end. The
  barb is two extra corners in the last ~15% of the path — measurable with the
  arc-length corner detector that already exists.
- `text`: an open stroke with many direction changes over a short path, low
  extent, wide aspect. *Distinct from the erase scratch, which is defined
  relationally by crossing something* — writing sits in space.
- `dot`: a mark whose size is tiny at the hand's scale.

**Ship:** the benchmark covers 8 shapes and still reads ≥99%, and a hand-drawn
arrow is told from a line, and writing in a box from a box in a box.

### Stage 2 — The diagram rung  ·  ✅ built
New `src/diagram/roles.ts`: the §3 table, applied over shapes + relations.

**Ship:** draw a flowchart and every mark reports its role; draw a page and
every mark reports its role; anything the table cannot place says
`unclassified` rather than guessing.

### Stage 3 — Genre  ·  ✅ built
`genreOf(roles)` → `layout` | `graph` | `mixed`, from role counts.

**Ship:** four boxes in a grid say `layout`; three boxes and two arrows say
`graph`; the inspector shows which and why.

### Stage 4 — The graph code target  ·  ✅ built
`src/parse/graph.ts` beside `parse/layout.ts`. Nodes positioned where they were
drawn; edges as SVG paths following the drawn line; labels as content. Same
contract as the layout target: **the engine owns structure, the model owns
content**, and `data-region` still ties ink to element.

**Ship:** draw two boxes and an arrow, get a running diagram whose connector
follows your ink, change a box's copy without the arrow moving.

### Stage 5 — Concepts rebuilt on roles  ·  ✅ built
The existing six concepts currently match raw relations. Rebuild them over
roles: `row` is peers that are all `node`s; `frame` is a `container` with
contents; `flow` is `node`s joined by `edge`s. Same names, one rung up, far
less to say.

**Ship:** the palette offers by role and genre, and the concept predicates get
shorter rather than longer.

### Stage 6 — Show the ladder  ·  ✅ built
The inspector walks it for any mark:

```
stroke:7
  ink        412 points, drawn at 1.0×
  shape      rectangle 0.90 — closed, 4 corners near 89°, fills 98% of its box
  role       container — encloses r2, r3
  code       <section data-region="r1">  ·  flex column, 2 children
```

**Ship:** every mark on the canvas can be walked from ink to code, and each rung
says why. This is also the demo that makes the idea legible to someone else.

**What the build found.** The benchmark over 1674 hand-drawn strokes reads
99.8%, arrows 100%; the one thing that took tuning was a two-wing arrowhead,
three corners and legitimately a third of the stroke, which a tight head window
read as a bent line every time. The role table forced two decisions worth
recording: a lone closed box is a `node`, not a note — you draw boxes before you
connect them — and "relates to nothing" has to mean no *engaging* relation, or a
note in the margin the same size as a box on the page stops being in the margin.
Concepts rebuilt on roles passed every existing concept test unchanged, and
every predicate got shorter. 390 core tests; the browser e2e compiles a page and
a flowchart in the same run.

### Stage 7 — Take the reading up  ·  ✅ built
The rungs were legible but inert: a mark read as *rectangle 0.86* still looked
like a wobble, and the model building a page was told the boxes' rects and
nothing of what the engine had read about them.

**Clean forms** (`src/session/clean.ts`). A confident, unambiguous Tier 0
reading is offered as a dashed ghost of its clean form; taking the offer adds a
`'clean'` rep beside the ink, like tidy's `'transform'`. The ink stays faint
underneath, undo drops the form. The gate is a floor *and* a margin over the
next reading, so a pentagon is never quietly settled; writing is never redrawn.
Over the 1674-stroke corpus: ≥95% of every drawable shape offered, zero wrong,
zero for text — pinned. The one detector fix it forced: a 5:1 banner lost a
corner at each end to path-fraction suppression, so the window is now bounded
by the short side.

**The drawing is the brief** (`describeReading`). Generation now hands the
model genre, roles, engaging relations, concepts and names in *region ids*, plus
a reading of each container's contents on their own — the row inside a frame
does not exist at the scope of the frame. "A page" is told to infer a subject
from that structure rather than write placeholders.

---

## 5. What this changes about what exists

- **`src/concepts/concept.ts`** — the six concepts stay by name, but their
  predicates move from relations to roles (Stage 5). Simpler, and correctly
  layered.
- **`src/parse/layout.ts`** — unchanged, but it stops being the only target. It
  becomes what `genre === 'layout'` selects.
- **`src/relate/relations.ts`** — unchanged. It is the substrate roles are
  derived from, and it is doing its job.
- **Nothing about the gesture, the palette, or Tier 0 conversions changes.**
  The palette gets better offers because the readings underneath it get sharper.

---

## 6. Decisions I need from you

**1. What should a graph *become*?** (Stage 4, the one real fork.)
My recommendation is **HTML nodes + SVG connectors**, because it keeps the
invariant that the ink outlines the element, and an edge can literally follow
the path you drew. The alternatives are a data model plus a renderer (cleaner,
less tangible) or Mermaid (instant, but the geometry you drew is thrown away —
which contradicts the whole premise).

**2. Is "there is writing here" enough for `text` this sprint?**
I think yes, and that it is a genuinely good decoupling: the `label` role does
not need to know *what* the writing says. Handwriting then upgrades a rung that
already works. Say if you would rather block on reading it.

**3. Arrows: single-stroke only?**
A line with a barb drawn in one movement is tractable now. An arrowhead drawn as
a *separate* stroke is a composition problem — two marks that together are one
edge — and I would defer it rather than half-do it.

**4. Do the six concepts keep their names?**
`row`, `column`, `frame`, `flow`, `grid`, `labelled`. They read well and Stage 5
only changes what they are computed from. Flagging it because renaming is cheap
now and expensive later.

---

## 7. What I would explicitly NOT do this sprint

- **Handwriting recognition.** Stage 1 gives `text` as a role-bearing shape; what
  it *says* is a separate capability and should not gate this.
- **More concepts.** The library grows after the rungs are fixed, not before.
- **More model work.** The transport, routing and bridge are done and were the
  premature part. This sprint should not need a model at all except in Stage 4,
  and only for content.
- **Two-stroke compositions** (arrowhead as its own mark, a box drawn in two
  strokes). Real, and a different problem.

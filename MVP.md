# MetaMedium MVP: Ink Over Living Artifacts

**Date:** August 2026
**Status:** **Built and verified** (19 Aug 2026). The loop in §2 runs end to end
in `Demos/session-engine.html`; §7 records what each stage actually cost and
what it taught. This stays the product definition — it is no longer a plan.
**Relationship to other docs:** `ARCHITECTURE-v6` is the engine, `ARCHITECTURE-v7`
is the model-in-the-loop plan. This is the **product** those two are for. Where
v7 Stage D said "diagram → code," this says what that actually looks like and
raises the bar: not code *beside* the diagram, code *under the ink*.

---

## 1. The product, in one paragraph

An infinite canvas you draw on. Strokes are simplified, recognized, and read as
diagram components. Circle anything and make your command mark, and the canvas
offers what it could become — including a freeform prompt. Fill that prompt and
the enclosed drawing becomes **living code**: a real, rendered artifact sitting
in the canvas at the place you drew it, with your doodled boxes still standing
as the outlines of its regions. Then you keep drawing — **on top of the running
thing** — and the ink addresses whatever is underneath it.

The distinguishing claim is unchanged from v7, but it now has teeth: **the board
is smart about relationships.** A mark over a live artifact is not a screenshot
annotation. It is a coordinate intersection with a known region of known code,
which the model receives as fact rather than inferring from pixels.

---

## 2. The one loop

The MVP is one loop, demonstrated end to end. Everything else is support.

1. **Doodle.** A few boxes on an infinite canvas. Recognized as rectangles;
   held, not committed.
2. **Zoom out** far enough to see the whole set.
3. **Lasso** — one stroke enclosing all of them.
4. **Command** — a second stroke that *intersects* the lasso. This is **your**
   mark, taught to the system by drawing it five times at first run.
5. **The context tools appear** at the selection: the usual suggestions
   (name-as-new, match, keep-as-drawing) **plus a freeform prompt box**.
6. **Type into it:** *"website with the copy in the squares."*
7. **It generates.** A live artifact renders in place. The drawn boxes are the
   outlines of its regions — the wireframe stays, it does not evaporate into a
   picture.
8. **Keep drawing on top of it.** Circle a region of the running page, make the
   command mark, prompt again. The ink knows what is under it.

Step 8 is the MVP's reason to exist. Steps 1–7 are table stakes that several
products approximate; step 8 is the thing only a grounded canvas can do.

---

## 3. What is genuinely new here

Three ideas, none of which v7 contains:

### 3.1 The command gesture is *learned*, not hardcoded

Today `isCheckLike()` hardcodes a check mark. In the MVP, first run asks you to
draw your command mark **five times** and fingerprints it.

This is the thesis applied to itself. The system already learns user
vocabulary — draw a circle, save it as "bubble," and a fingerprint plus
`matchPrimitiveFromLibrary` recognizes it forever. A gesture is the same object
on a different plane. **The gesture grammar becomes user vocabulary**, which is
what MetaMedium claims to be about, aimed at its own interface.

It is also the onboarding. Teaching the system your mark *is* the tutorial.

### 3.2 Artifacts are alive, and ink lands on them

Today an artifact is a blessed group of strokes. In the MVP an artifact may
carry a `'code'` rep that **renders and runs** in the canvas at its world
position. Ink drawn over it hit-tests into the artifact's own DOM, so a lasso
over a live page resolves to elements and their source ranges.

### 3.3 The doodle stays as the decomposition

The boxes you drew are not consumed by generation. They persist as the outlines
of the regions they produced. Drawing decomposes the artifact and the
decomposition remains visible and editable — move a box, the region follows.

**This is a constraint on generation, not a rendering trick** (see §6.2).

---

## 4. Reckoning: what already stands

The good news, and the reason this is worth doing now: **the loop in §2 is the
loop the engine already runs, with three substitutions.**

```
BUILT:   lasso → check    → suggestions          → bless    → artifact
MVP:     lasso → command  → suggestions + prompt → generate → live artifact
```

`command` is a learned `check`. `prompt` is a third suggestion kind. `generate`
is a `bless` that attaches a `'code'` rep. The state machine does not change.

| Piece | Status | Where |
|---|---|---|
| Deferred-commitment state machine (lasso → summon → bless) | **Built, tested** | `metamedium-core/src/session/session.ts` |
| Stroke fingerprints, shape recognition, multi-parse | **Built, tested** | `src/geometry.ts`, `src/recognition.ts` |
| Spatial graph — intersection, touching, containment | **Built, tested** | `src/spatial.ts` |
| Learned primitives from fingerprints | **Built** — reusable for gestures verbatim | `matchPrimitiveFromLibrary` |
| Lasso resolution by a second nearby stroke | **Built** — intersection is a stricter case of the existing overlap test | `src/session/gesture.ts` |
| Summon with suggestion list, rendered as context tools | **Built** | `session.ts` + `Demos/session-engine.html` |
| Freeform text entry swapped into the summon | **Built** — `swapToInput` / `swapToQuestion` are the exact pattern the prompt box needs | `session-engine.html:823` |
| Model as a peer participant; `propose()` channel | **Built (v7 A)** | `src/participants/agent.ts` |
| Grounded serializer — geometry, position, relations, attribution | **Built (v7 A)** | `src/participants/serialize.ts` |
| One transport for Ollama / LM Studio / OpenRouter + Anthropic | **Built (v7 A)** | `src/llm/provider.ts` |
| Answers placed as nodes in the canvas | **Built (v7 C)** | `session.answer()` |
| Multi-interpretation read path | **Built (v7 A)** | `src/session/interpretations.ts` |
| `Rep.modality` open set — `'code'` needs no schema change | **Built** | `src/session/nodes.ts` |
| **Infinite canvas, pan/zoom** | **Missing in the surface** — but written and working in `lens-canvas/src/canvas/viewport.ts` (~110 lines, portable as-is) | Port |
| **Learned command gesture** | **Missing** — mechanism exists, plane does not | New |
| **Live artifact rendering (DOM layer)** | **Missing** — the largest new piece | New surface |
| **Ink → live-DOM hit testing** | **Missing** — the novel piece | New surface |
| **Generation prompt + `'code'` rep** | **Missing** — v7 Stage D, unstarted | Core + surface |
| Scribble-to-erase gesture | **Missing** — `erase(nodeId)` exists; the *gesture* does not | Surface |

**The honest summary: the engine is close to ready and the surface is where the
work is.** Core changes are small and additive. `Demos/session-engine.html` (874
lines) has to grow a viewport, a DOM overlay, and hit testing.

---

## 5. Four mechanisms, specified

### 5.1 Infinite canvas — and why world coordinates are load-bearing

Port `lens-canvas/src/canvas/viewport.ts`. The engine is already
renderer-agnostic and stores bounds in whatever space it is fed.

**The one thing that must be right:** the surface feeds the engine **world**
coordinates, never screen coordinates. Every threshold in the engine is in
pixels — `checkProximityPx: 80`, `clusterThresholdPx: 60`, closure gaps,
size-relative overshoot. In world space those are zoom-invariant and the grammar
holds at any zoom. In screen space, §2 step 3 breaks the moment you zoom out to
lasso, which is precisely the flow the MVP is built on.

### 5.2 The command mark

Eight scale-free measurements, five of them shape and three of them
**orientation** — the axis the first attempt lacked entirely, and the reason it
could not tell a check from an upside-down caret:

| | |
|---|---|
| `straightness`, `corners`, `aspect`, `closureRatio` | shape |
| `armRatio` | shorter arm over longer, split at the sharpest corner. A V is 1.0; a check ~0.62 |
| `turnSharpness` | how hard that corner turns |
| `vertexDepth` | where the elbow sits vertically in the stroke's box. 0 = a caret, 1 = a check |
| `endRise` | how much higher the stroke ends than it began |

- `learnCommandMark(samples)` — feature centroid across the samples plus
  per-feature spread, which gives the accept band for free. A steady hand gets a
  tight band; a sloppy one gets a loose band and is told so.
- **Tolerance floors are the designed generosity**; a learned spread only ever
  widens them. The straightness floor is the widest of the set and was measured,
  not guessed: across 60 hand-drawn checks straightness ranges 0.46–0.74,
  because a deep dip lengthens the path without moving the endpoints.
- `BUILTIN_COMMAND_MARK` is that same signature, learned from canonical check
  samples at module load. The default is vocabulary we ship, not a code path.

**Rejection matters more than recognition.** A mark that fires while you draw is
worse than no gesture at all. `commandmark.bench.test.ts` pins **100% acceptance**
of hand-drawn checks across size, proportion, slant and wobble, and **zero false
fires** across the whole drawing corpus — rectangles, triangles, circles, lines,
arcs, scratch-outs, diamonds, and the near-misses (L, backwards L, V, caret,
check-drawn-backwards) that the old rule accepted. `collidesWith` additionally
refuses a taught signature that matches the user's existing primitives.

**One engagement rule for every mark:** cross the selection, overlap it, or come
close *relative to the selection's own size*. Previously a taught mark required
strict intersection while the built-in check needed only to land within 80px —
two behaviours to learn, and a fixed pixel term that meant something different at
every zoom. No fixed pixel term remains in the gesture grammar.

### 5.3 Two layers, one transform

Ink stays on `<canvas>`. Live artifacts are real DOM in an overlay `<div>`,
positioned in world space, both driven by **one** viewport matrix.

- Artifact code renders into a sandboxed `<iframe srcdoc>` sized to the
  artifact's world bounds and CSS-transformed by the shared matrix.
- Pointer events default to the ink layer — **you are always drawing.** That is
  the no-modes rule, and it is what makes "doodle atop that page" work at all.
  Interacting with the artifact itself is the deliberate act, not drawing.

This split has to be built correctly the first time; retrofitting a second
layer under an established transform is painful.

### 5.4 Ink over artifact → coordinate intersection with code

The novel mechanism, and the cheapest of the four to describe:

```
ink bounds (world)
  → artifact-local coordinates
  → iframe.contentDocument.elementsFromPoint()
  → elements + their source ranges in the 'code' rep
  → an addressed region, sent to the model as fact
```

The model receives *"the ink encloses `<section class="hero">`, lines 12–28"* —
not a picture it has to squint at. That is what "formal coordinate intersections
with code aspects" means, and it is the whole reason the substrate was built.

---

## 6. Amendments to standing rules

Two long-standing commitments change here. Both deliberately, both scoped.

### 6.1 Pixels are admitted — as confirmation, never as the ground

`CLAUDE.md` states: *"LLMs receive structured geometric data — not
screenshots."* That rule stands **for recognition**, which is where it was
earned.

For the **generate and critique path** it is amended: the model receives
structured geometry and code-region facts as the ground truth, **plus a render
to confirm against**. A generated page has a visual result, and refusing to let
the model see the result of its own code is dogma, not discipline.

The ordering is the commitment: **geometry first and authoritative, pixels
second and corroborating.** If a reading is only reachable from the image, it is
a candidate like any other — not an override. `test-vision.html` remains the
control case, and now has a real job: measuring whether grounded input actually
beats the image on this task (v7 §8's open question, made answerable).

### 6.2 Generation is constrained by the ink, not merely prompted by it

If the model is asked politely to respect the drawn boxes, it will sometimes
not, and the ink will float off the divs it supposedly outlines. The premise
fails visibly on the first demo where it drifts.

So the drawn geometry is not advice, it is **the frame**. Generation receives an
explicit region layout derived from the boxes — id, world rect, containment,
recognized role, any text inside — and produces content *into* that frame. The
model chooses what goes in a region and how it looks. **It does not choose where
the regions are.** The human drew that, and the ink is the record of it.

---

## 7. Staging — shipped

All six stages landed. **271 core tests**, plus a 21-step end-to-end check
that drives the real UI in a browser (`Demos/session-engine.e2e.js`).

| # | Stage | Ship criterion | Status |
|---|---|---|---|
| **1** | **Infinite canvas** | Zoom out, lasso a group too wide for one screen, loop still closes | ✅ verified at 0.41× |
| **2** | **The command mark** | Your mark summons; ordinary drawing never fires it | ✅ built-in check works untaught; 5 samples replace it; 100% accept / 0 false fires |
| **3** | **Prompt → living code** | Boxes + *"website with the copy in the squares"* → a real page in place | ✅ renders in a sandboxed iframe at world position |
| **4** | **Ink lands on the artifact** | Circle a region of the live page, command, prompt — that region changes | ✅ resolves to `r2`; the untouched region comes back byte-identical |
| **5** | **The decomposition persists** | The drawn boxes stay as the region outlines | ✅ every rect matches its generated div **to the pixel** |
| **6** | **Scratch erase** | Scribble over a mark, it goes; undo restores | ✅ relational crossing-count, ported from the sibling `johnhanacek` repo |

### The recognition and gesture refresh (19 Aug 2026)

Two things the first pass got wrong badly enough to be worth recording.

**A hand-drawn rectangle read as a triangle.** Benchmarked over 1080 hand-drawn
strokes, top-reading accuracy was **40.4%** — rectangles **10%**. Three causes:
corner counting measured in point-index space (so the same rectangle returned 1,
2 or 3 corners depending only on drawing speed, and never 4, because the corner
on the stroke's seam was structurally unscannable); no measurement separated a
box from a triangle at all; and the detectors carried fixed confidences with
overlapping corner bands, so triangle beat rectangle because 0.85 > 0.80. Now
**99.9%**, with corners measured along the path, `extent` as the discriminator,
and confidence scored from evidence. Two further findings fell out of the
benchmark: straightness was dominated by digitizer noise at high report rates,
and Tier 0 could claim certainty. See CLAUDE.md.

**The command gesture was never defined.** *Open, one or two corners, smaller
than the lasso* fired on an L, a backwards L, a V, an upside-down caret, and a
check drawn backwards. §5.2 replaces it with an actual definition — including
the orientation features the first attempt lacked — and a benchmark that tests
silence harder than it tests recognition.

The shape of both mistakes was the same: **a threshold stated in the wrong
space** (point indices instead of arc length; pixels instead of ratios), and
**a decision made by a constant instead of by a measurement**.

### What the build actually taught

Four things were not in the plan, and three of them were bugs in the engine that
only the MVP's zoom could expose.

**1. World coordinates cost more than they look.** Every fixed-pixel threshold in
the engine — closure, overshoot, gesture proximity, wire endpoints — silently
became zoom-dependent the moment the surface fed world coordinates. The same
hand-drawn check reads as an open tick at 1× and a closed loop at 1.7×.

The fix is a one-line idea: **position belongs in world space, the hand does
not.** `getFingerprint(points, scale)` takes world-units-per-screen-pixel, and
the fixed thresholds are interpreted in the space the hand actually worked in.
The scale is logged with each stroke, so replay is deterministic. The
size-relative half of each rule needed no change — it was already scale-free,
which is why it was the right idea to begin with.

**2. `isStrokeClosed` contradicted its own documentation.** The stated intent is
*"small shapes need tight closure, large shapes tolerate bigger gaps."* The
implementation did the opposite at the small end: an unbounded `gap < 50px`
declared a 45px-wide caret with 45px between its ends to be *closed*. That is
what was breaking the command mark, which is small by nature. Capping the
absolute allowance at half the stroke's own size restores the documented
behaviour, and 215 tests agree.

**3. A closed stroke must never be a scratch.** A loop merely tangent to a
shape's edge can count six crossings and rub out what you meant to select.
Closure already does most of the discriminating everywhere else in the engine;
letting it decide here too removes the ambiguity entirely. Related: scratch
targets are **ink**, never artifacts — testing an artifact's bounding box would
mean a mark grazing the edge of a page could delete the page.

**4. Two surface bugs worth recording, because both were lies to the user.** The
"erased" flash fired whenever a lasso was consumed by a command mark (the lasso
leaves the content plane, so the content count drops) — feedback that would have
made the one operation users most need to trust look destructive. And the flash
was set *after* the render that would have shown it, so a real erase was silent.
Erase feedback now reads the stroke's own `scratch` gesture rep.

### What this does to v7

- **Stage D (diagram → code) is absorbed and raised** — and shipped, as Stages
  3 and 5 here, with the code rendering *in* the canvas rather than beside it.
- **Stage E (handwriting) is deferred, not cancelled.** Typed text into a region
  stands in for now; handwriting makes "the copy in the squares" literal.
- **Stages A and C stand unchanged** and are load-bearing: transport,
  serializer, agent adapter, and the multi-interpretation read path are exactly
  what generation calls.
- **Multi-interpretation carries through.** Several models may each propose code
  for the same drawing; every version is held and attributed, and rendering the
  newest is a display choice, not a commitment.

## 8. Risks worth naming

1. **The two-layer transform.** Ink and live DOM must agree on one matrix
   exactly, or ink drifts off artifacts under zoom. Build it once, correctly.
2. **Generation drift.** Covered by §6.2 — but if constrained generation turns
   out to fight the model badly, the fallback is to generate *into* a
   pre-built absolute-positioned scaffold and let the model fill leaves only.
3. **Gesture false-positives.** §5.2. The failure mode is a canvas that summons
   while you draw, which reads as broken rather than eager.
4. **Prompt size.** v7 §8's open question arrives here for real: a canvas with a
   live artifact plus ink plus code regions is far more context than three
   circles and two lines. The spatial graph gives the answer — send the
   neighborhood, not the world — but the cutoff needs measuring.
5. **Sandbox posture — decided.** Artifacts render with
   `sandbox="allow-same-origin"` and **not** `allow-scripts`. Same-origin is
   what lets ink hit-test into the artifact's own DOM, which is the novel
   capability; granting both together is the known sandbox escape, and running
   arbitrary generated JS is not needed to prove the loop. Revisit explicitly if
   interactive artifacts are wanted — the fallback is region-level addressing,
   which already works without reading the document at all.

# MetaMedium MVP: Ink Over Living Artifacts

**Date:** August 2026
**Status:** Active product definition — the target v7's stages now serve
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

### 5.2 The learned command gesture

A gesture library on the gesture plane, parallel to the primitive library:

- `learnGesture(samples: Point[][]) → GestureSignature` — fingerprint centroid
  across five samples, plus per-feature spread, which gives the tolerance band
  for free. A user with a consistent mark gets a tight band; a sloppy one gets a
  loose band and is told so.
- `matchesCommand(fp, signature)` — weighted fingerprint comparison, the same
  shape as `matchPrimitiveFromLibrary`.
- `resolvesLasso` swaps `isCheckLike` for `matchesCommand`, and tightens
  proximity from "overlaps or within 80px" to **intersects**, per §2 step 4.
- The built-in check stays as the default signature, so the system works before
  it is taught anything.

**Rejection matters more than recognition.** A command mark that also fires
while you are drawing is worse than no gesture at all. The five samples must
produce a band that ordinary drawing falls outside of, and the engine should
refuse to accept a signature that collides with the user's existing primitives.

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

## 7. Staging

Each stage ends in something demonstrable. Estimates assume focused days.

| # | Stage | Ship criterion | Est. |
|---|---|---|---|
| **1** | **Infinite canvas.** Port `viewport.ts`; feed world coords to the engine; pinch/wheel zoom, pan. | Zoom out, lasso a group too wide for one screen, and the canonical loop still closes to `0 loose · 1 artifact`. | ~1d |
| **2** | **Your command mark.** Five-sample fingerprint, gesture library, intersection test, first-run teach flow. | Your own mark summons the context tools; ordinary drawing never fires it. | ~2d |
| **3** | **Prompt box → living code.** Third suggestion kind; `'code'` rep; DOM overlay; sandboxed render at world bounds. | Boxes + *"website with the copy in the squares"* → a real page rendered in place. | ~4d |
| **4** | **Ink lands on the artifact.** Hit-test ink into artifact DOM; addressed regions into the prompt. | Circle a region of the live page, command, *"make this the header"* — and that region changes. | ~3d |
| **5** | **The decomposition persists.** Boxes stay as region outlines; editing a box moves its region. | Drag a drawn box; the layout follows. Erase one; the region goes. | ~2d |
| **6** | **Scribble erase.** The gesture over the existing `erase()`. | Scribble over a mark, it goes; undo restores. | ~1d |

**~2 weeks to the loop standing end to end.** Stage 3 is the risky one and the
one to prototype first if a single day is available for de-risking.

### What this does to v7

- **Stage D (diagram → code) is absorbed and raised.** Its ship criterion —
  "draw a flow, get runnable code, change the flow, see the code follow" — is
  Stages 3 and 5 here, with the addition that the code *renders in the canvas*.
- **Stage E (handwriting) is deferred, not cancelled.** "Copy in the squares"
  needs handwriting to be literal. For the MVP, typed text into a region is an
  acceptable stand-in; handwriting makes it whole. It follows Stage 4.
- **Stages A and C stand unchanged** and are load-bearing: the transport,
  serializer, agent adapter, and multi-interpretation read path are exactly what
  Stage 3 calls.
- **Multi-interpretation carries through.** Several models may each propose code
  for the same drawing. Nothing here collapses that: candidate artifacts are
  held side by side and the human blesses one. Generation is a proposal.

---

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
5. **Sandbox posture.** Same-origin access to artifact DOM is required for hit
   testing. The content is generated for the user and runs locally, but this
   should be a deliberate, documented decision rather than a default.

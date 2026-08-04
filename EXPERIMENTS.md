# MetaMedium Experiments

Experiments are where platform bets get **de-risked before they land in
`metamedium-core/`**. They are deliberately cheap, deliberately forked, and
deliberately *not* the product. The platform is the whitepaper + the session
engine + the flagship demo; everything on this page exists to feed that.

**The rule:** an experiment may re-implement whatever it needs to move fast.
When an idea proves out, it lands in `metamedium-core/` **with tests**, and the
experiment either adopts the core or gets parked. Experiments never become the
thing the project is *about*.

Status legend: **live** = actively worked · **parked** = intact, not being
extended · **folded in** = its lesson has landed in core.

---

## lens-canvas/ — infinite canvas, one lens per data type

**Status:** live · TypeScript + Vite + vitest (19 tests) · `npm run dev`

An infinite canvas where every object is a `LensNode` in a JSON graph, and each
node is drawn by whichever "lens" bids highest for it. Four phases shipped
(card layout, front/back node flip, lens-switcher HUD, resize + auto-height).
Lenses so far: `card`, `back`, `code`, `tree`, `raw`.

**What it de-risks for the platform** — two things the roadmap had filed as
"plan only":

1. **The node model in practice.** `metamedium-core-schema.md` argues *type
   emerges from connections rather than being assigned*. lens-canvas is that
   claim running: nodes carry inferred type, and the graph is the only truth.
2. **MoE routing, concretely.** `src/core/lens-registry.ts` has each lens vote
   0–1 on whether it can render a value, highest confidence wins. That is
   ARCHITECTURE-v5's expert-routing idea at a scale small enough to actually
   run — and it works, which is real evidence for the deferred router.

It also carries a **three-caller API** worth stealing: the same graph
operations are reachable by human gesture, by LLM (`window.__canvas.addNode()`),
and by direct import in tests. Anything the LLM can do, a test can do.

Detail lives with the experiment: [`lens-canvas/CLAUDE.md`](lens-canvas/CLAUDE.md)
(agent guide), [`DEV_LOG.md`](lens-canvas/DEV_LOG.md) (what shipped),
[`IMPLEMENTATION_PLAN.md`](lens-canvas/IMPLEMENTATION_PLAN.md) (phase plan).

> **Note:** lens-canvas uses the personal-site palette, not the MetaMedium
> palette — see [Design Systems](#design-systems) below. It is also not yet
> covered by CI.

---

## v2-poc/ — drawing-responsive text reflow

**Status:** parked (intact, buildable) · esbuild + `@chenglou/pretext`

Whitepaper text reflows in real time around shapes the reader draws. The most
direct demonstration of the medium-blending thesis: drawing and text as one
medium rather than two panes.

**Feeds the platform:** it is the interactive figure Whitepaper v5.1 is built
around (see ROADMAP.md). Source is `v2-poc/src/main.ts`; `bundle.js` is the
committed build artifact.

---

## test-vision.html — VLM interpretation PoC

**Status:** parked · single file, Qwen3.5 VLM

Probes a path the tiered-LLM design does not currently take: giving a
vision-language model the *rendered image* instead of structured geometry.

**Why it matters as a control:** the platform's standing commitment is that
LLMs receive fingerprints, spatial graphs, and library context — never
screenshots. This experiment is how that commitment stays honest rather than
assumed. Any argument for grounded-over-pixels should be able to point at what
the pixel path actually did.

---

## test-llm.html — LLM harness

**Status:** parked · single file

Standalone harness for exercising LLM calls outside any demo. Useful for
checking a prompt or a local endpoint without loading a canvas.

---

## manim-explainer/ — the ~50-second explainer

**Status:** live · Python + manim

Animated explanation of the core loop: marks become meaning through recursive
composition, landing on *"the same mark simultaneously IS a stroke, a circle,
and 'wholeness' — type emerges from connection."*

**Feeds the platform:** ROADMAP's Demo v3 Step 3 calls for a video of the
canonical loop for the whitepaper. This is the communication asset for the
thesis the engine implements.

Source (`script.py`, `monolith.py`, `plan.md`, ffmpeg concat lists) and preview
stills are tracked. **Rendered MP4s and manim's `media/` cache are gitignored**
— ~23MB of regenerable build output. Re-render from the scripts.

---

## playground.html — personal sandbox

**Status:** parked · single file

Loose sketch surface on the personal-site design language. Unclassified; kept
because it is cheap to keep. Not a platform surface.

---

## Design Systems

Two palettes coexist **on purpose**, and the split is by brand, not by drift:

| Surface | Palette | Type |
|---|---|---|
| Whitepaper, `Demos/`, flagship demos | `#0a0a0f` bg · `#e8e4d9` text · `#c9a84c` gold | Space Grotesk |
| lens-canvas, manim-explainer, playground | `#020a12` sea-deep · `#7dd8f7` cyan · `#d4af37` gold | JetBrains Mono |

The second is the personal-site (johnhanacek.com) language. The first is
MetaMedium's current look.

> 📌 **Pinned:** a deliberate MetaMedium style is still to be defined. Until
> then, treat the whitepaper palette as *current*, not as *decided*, and do not
> converge the two — the separation is intended.

---

## Promoting an experiment

When something here has earned its place in the platform:

1. Port it into `metamedium-core/` with tests (behavior-identical first, then
   improve — reconcile by test, not by guess).
2. Rebuild the browser bundle and re-copy it to `Demos/` — CI fails if the
   committed copy drifts.
3. Update [ROADMAP.md](ROADMAP.md) and the repo map in [CLAUDE.md](CLAUDE.md).
4. Move this entry to **folded in** with a one-line note on where it landed.

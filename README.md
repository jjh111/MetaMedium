# MetaMedium

**A recombinatorial drawing system** — interfaces that learn your visual
vocabulary, recognize compositional patterns as you draw, and use AI as a
"meta-word" interpreting over geometrically grounded strokes.

## Start Here

**📄 Interactive whitepaper (v5): [MetaMedium: AI Beyond Chat](https://jjh111.github.io/MetaMedium/)**

## Demos

| Demo | What it shows |
|---|---|
| [Canvas demo (flagship)](https://jjh111.github.io/MetaMedium/doodle2-canvas.html) | Heuristic recognition, spatial graph, visual vocabulary library, live "why" reasoning. Works offline, touch + mouse. |
| [MetaDoodle (LLM tiers)](https://jjh111.github.io/MetaMedium/metadoodle1.html) | Tiered AI interpretation: heuristics → in-browser WebLLM (WebGPU) → LM Studio local API. Plus voice input. |
| [v2 PoC: drawing-responsive text](https://jjh111.github.io/MetaMedium/v2-poc/) | Whitepaper text reflows in real time around shapes you draw — the medium-blending thesis, live. |
| [No-modes session engine](https://jjh111.github.io/MetaMedium/Demos/session-engine.html) | The new engine's reference surface: doodle → circle it → check ✓ → name it → it's recognized when drawn again. No tools, no modes. |
| [Micro demos](https://github.com/jjh111/MetaMedium/tree/master/Demos) | Fish vocabulary, composition diagrams, no-modes graph, and other small experiments. |

Flagship demo keyboard shortcuts: `Ctrl+Z` undo, `Ctrl+Shift+Z` redo,
`Enter` accept top suggestion, `Escape` clear selection.

## Plan & Architecture

- **[ROADMAP.md](ROADMAP.md)** — status, the August 2026 accounting, and what's next
- **[ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md](ARCHITECTURE-v7-PARTICIPANTS-AND-TIERS.md)** — active plan: a model in the loop, and the conversation benchmark
- **[ARCHITECTURE-v6-SESSION-ENGINE.md](ARCHITECTURE-v6-SESSION-ENGINE.md)** — active design: the no-modes session engine
- [metamedium-core-schema.md](metamedium-core-schema.md) — graph data model: everything is a node
- [ARCHITECTURE-v5-UNIFIED-ENGINE.md](ARCHITECTURE-v5-UNIFIED-ENGINE.md) — partly superseded; reference for the deferred MoE/embedding work
- [archive/PRD-v4-LLM-Grounded.md](archive/PRD-v4-LLM-Grounded.md) — archived; still the spec for tiered escalation and the unbuilt MCP server
- [CLAUDE.md](CLAUDE.md) — codebase guide and the repo's single inventory (structure, conventions)

## Experiments

**[EXPERIMENTS.md](EXPERIMENTS.md)** — the side tier: lens-canvas (infinite
canvas + confidence-routed lenses), the drawing-responsive text PoC, vision/LLM
probes, and the explainer video. Experiments de-risk platform bets and feed
proven ideas back into `metamedium-core`; they aren't the product.

## Development

**The engine** — geometry, recognition, spatial graph, and the no-modes
session engine — lives in [`metamedium-core/`](metamedium-core/) (TypeScript,
zero runtime deps):

```bash
cd metamedium-core
npm install
npm test         # 86 tests incl. the canonical-loop executable spec
npm run build
```

The React/TypeScript app lives in `Web App Skeleton/`:

```bash
cd "Web App Skeleton"
npm install
npm run dev      # development server
npm test         # vitest suite (geometry, recognition, spatial)
npm run lint     # eslint
npm run build    # typecheck + production build
```

CI runs typecheck, lint, tests, and build for both packages on every push and
PR, and fails if the committed browser bundle drifts from core.

The standalone HTML demos are self-contained single files — serve the repo
root with `python -m http.server 8000` and open them directly.

## Previous Versions

- [Whitepaper v4](https://jjh111.github.io/MetaMedium/archive/MetaMedium_Whitepaper_v4.html) (superseded by v5)
- Earlier demo iterations live in [`archive/`](archive/)
- Supplemental resources: [jhanacek.net/metamedium-resources-65](https://jhanacek.net/metamedium-resources-65)

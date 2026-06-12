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
| [Micro demos](https://github.com/jjh111/MetaMedium/tree/master/Demos) | Fish vocabulary, composition diagrams, no-modes graph, and other small experiments. |

Flagship demo keyboard shortcuts: `Ctrl+Z` undo, `Ctrl+Shift+Z` redo,
`Enter` accept top suggestion, `Escape` clear selection.

## Plan & Architecture

- **[ROADMAP.md](ROADMAP.md)** — active plan: Whitepaper v5.1, then Demo v3 on a shared `metamedium-core`
- [PRD-v4-LLM-Grounded.md](PRD-v4-LLM-Grounded.md) — LLM-grounded architecture, tiered escalation, MCP server spec
- [ARCHITECTURE-v5-UNIFIED-ENGINE.md](ARCHITECTURE-v5-UNIFIED-ENGINE.md) — unified engine: shape experts, routing, state planes
- [metamedium-core-schema.md](metamedium-core-schema.md) — graph data model: everything is a node
- [CLAUDE.md](CLAUDE.md) — codebase guide (structure, thresholds, conventions)

## Development

The React/TypeScript app (future home of `metamedium-core`) lives in
`Web App Skeleton/`:

```bash
cd "Web App Skeleton"
npm install
npm run dev      # development server
npm test         # vitest suite (geometry, recognition, spatial)
npm run lint     # eslint
npm run build    # typecheck + production build
```

CI runs lint, tests, and build on every push and PR.

The standalone HTML demos are self-contained single files — serve the repo
root with `python -m http.server 8000` and open them directly.

## Previous Versions

- [Whitepaper v4](https://jjh111.github.io/MetaMedium/archive/MetaMedium_Whitepaper_v4.html) (superseded by v5)
- Earlier demo iterations live in [`archive/`](archive/)
- Supplemental resources: [jhanacek.net/metamedium-resources-65](https://jhanacek.net/metamedium-resources-65)

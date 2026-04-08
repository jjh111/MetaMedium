# Lens Canvas — Agent Development Guide

## What This Is

An infinite canvas that renders data objects with type-appropriate visualizations ("lenses"). Part of the MetaMedium project. The graph is the truth — everything on the canvas is a `LensNode` in a JSON graph.

## Quick Start

```bash
cd ~/Documents/GitHub/metamedium/lens-canvas
npm run dev    # Vite dev server on localhost:5173
npm test       # vitest — 19 tests for graph store
```

## Architecture

```
Graph Store (core/graph.ts)  ←→  Lens Registry (core/lens-registry.ts)
        ↓                              ↓
   Renderer (canvas/renderer.ts)  ←  Lenses (lenses/*.ts)
        ↓
   Viewport (canvas/viewport.ts) + Grid (canvas/grid.ts)
        ↓
   Interactions (canvas/interactions.ts)
```

**Data flow:** Graph mutations → event emitter → render loop reads graph → matches lens per node → draws to canvas.

**Three APIs for the same operations:**
1. Human: drawing gestures → graph mutations
2. LLM: `window.__canvas.addNode()` etc (console/HTTP)
3. Tests: direct import of graph functions

## Key Files

| File | Responsibility |
|------|---------------|
| `src/core/types.ts` | LensNode, Edge, GraphEvent interfaces |
| `src/core/graph.ts` | Graph store — CRUD, events, persistence, type inference |
| `src/core/lens-registry.ts` | MoE lens matching (confidence 0-1) |
| `src/lenses/raw.ts` | RawLens — fallback renderer |
| `src/canvas/viewport.ts` | Pan/zoom, screen↔world coordinate transforms |
| `src/canvas/renderer.ts` | Main render loop |
| `src/canvas/grid.ts` | Dot grid background |
| `src/canvas/interactions.ts` | Click, drag, double-click, delete |
| `src/main.ts` | Entry point, wiring, window.__canvas API |

## How to Add a New Lens

1. Create `src/lenses/your-lens.ts`:
```typescript
import type { Rect } from '../core/types';
import type { LensRenderOptions } from '../core/lens-registry';

export const YourLens = {
  id: 'your-lens',
  name: 'Your Lens',
  matches(dataType: string, data: unknown): number {
    // Return 0-1 confidence. Higher = more appropriate.
    if (dataType === 'your-type') return 0.9;
    return 0;
  },
  render(ctx: CanvasRenderingContext2D, data: unknown, bounds: Rect, options: LensRenderOptions) {
    // Draw into the canvas region defined by bounds
    // Use options.isDark for theme-aware colors
  },
};
```

2. Register in `src/main.ts`:
```typescript
import { YourLens } from './lenses/your-lens';
registerLens(YourLens);
```

## Conventions

- **Pure functions in `core/`** — no side effects, no DOM
- **Side effects in `canvas/` and `ui/`** — DOM, events, rendering
- **Every graph mutation gets a unit test**
- **Theme colors via CSS custom properties** — use `options.isDark` in lenses to pick the right palette
- **Monospace everywhere** — JetBrains Mono is the primary font

## Design Tokens

Dark: `--sea-deep: #020a12`, `--cyan: #7dd8f7`, `--gold: #d4af37`
Light: `--sea-deep: #f8f5f0`, `--cyan: #2a6b8a`, `--gold: #9a7b2a`
LLM nodes: `#8B5CF6` (purple)

Full token table in the vault: [[MetaMedium — Lens Canvas Implementation Path]]

## LLM API (window.__canvas)

```javascript
__canvas.addNode({ data: {...}, source: 'llm', position: {x, y, width, height} })
__canvas.addEdge({ from: 'node-id', to: 'node-id', type: 'dependency' })
__canvas.getGraph()  // returns { nodes: [...], edges: [...] }
__canvas.updateNode('id', { meaning: 'new meaning' })
__canvas.removeNode('id')
```

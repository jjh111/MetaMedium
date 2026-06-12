# metamedium-core

The headless MetaMedium engine: geometric grounding, multi-parse recognition,
spatial graph, and the **no-modes session engine** (lasso → check → summon →
bless → artifact). No rendering, no framework, no LLM calls, zero runtime
dependencies.

**Design rationale lives in `../ARCHITECTURE-v6-SESSION-ENGINE.md`. The
behavioral contract is `src/session/session.scenario.test.ts` — read both
before changing engine semantics.**

```bash
npm install           # dev deps only (typescript, vitest, esbuild)
npm test              # full suite incl. the canonical-loop scenario
npm run build         # ESM + .d.ts → dist/
npm run build:browser # IIFE bundle (window.MetaMediumCore) → dist/
```

A copy of the browser bundle is committed at `Demos/metamedium-core.browser.js`
for the GitHub Pages demo (`Demos/session-engine.html`). After engine changes,
rebuild and re-copy it — CI fails if it drifts from source.

## Wiring a surface (canvas, playground iframe, React app)

The engine is a state machine: feed it input events, render its state.
It never refuses input and never blocks the drawing loop.

```typescript
import { createSession, strokePointsOf, topInterpretation } from 'metamedium-core';

const session = createSession();

// 1. Feed strokes as the user finishes them (pointerup):
canvas.onStrokeComplete = (points) => session.addStroke(points, Date.now());

// 2. Render from state, on every change:
session.subscribe((state) => {
  // Content plane: raw ink always; refined/labels are the renderer's choice.
  for (const id of state.contentIds) {
    const node = state.nodes.get(id)!;
    drawInk(strokePointsOf(node));            // ink is ground truth
    maybeDrawLabel(topInterpretation(node));  // surface the refined reading
  }

  // A pending lasso is BOTH content and gesture-candidate — render normally,
  // optionally hint (e.g. faint gold) that it could become a selection.

  // An active summon = show contextual chips near the gesture. Non-modal:
  // the user drawing anything else dissolves it automatically.
  if (state.summon) {
    showChips(state.summon.suggestions, {
      onPick: (sug) =>
        sug.kind === 'name-as-new'
          ? promptName((name) => session.bless({ summonId: state.summon!.id, name, at: Date.now() }))
          : session.bless({ summonId: state.summon!.id, suggestionId: sug.id, at: Date.now() }),
    });
  }

  // Held recognition of known artifacts ("this looks like your molecule"):
  for (const c of state.clusterCandidates) hintMatch(c.nodeIds, c.matches[0]);
});
```

## Module map

| Module | What it holds |
|---|---|
| `geometry` | fingerprinting, closure, corners, hull, bounds ops (ported from Web App Skeleton, behavior-identical) |
| `recognition` | Tier-0 heuristic shape experts with grounded `reasoning` strings |
| `spatial` | `buildSpatialGraph` (touching/intersecting/contains), `spatialCluster` |
| `session/nodes` | the node model: open `reps` list + `edges` + `capability` tier — everything is a node |
| `session/gesture` | lasso/check predicates; temporal **+** contextual resolution |
| `session/session` | the engine: events in, `SessionState` out; event-sourced — `undo()` = drop last input + replay; `erase()` with artifact degradation; wire (`connects`) inference |

## Invariants (enforced by tests — keep them)

- Input is never refused; there is no mode.
- Interpretations are held (multi-parse), never auto-committed.
- A lasso is simultaneously content and gesture-candidate until the next event resolves it.
- A check **summons**; blessing is a separate act. Drawing past a summon dismisses it.
- Ink is never destroyed — members and gestures keep their nodes and reps.
- Everything starts at capability 0 (inert); escalation is a blessed act (v0.2+).

## Departures from the legacy heuristics (made knowingly)

- `checkOvershoot` is now size-relative (`min(50px, 20% of stroke size)`).
  The legacy fixed 50px threshold made strokes shorter than ~70px
  unrecognizable as lines. Covered by tests in geometry/recognition suites.

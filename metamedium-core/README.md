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
npm run build:node    # ESM bundle for Node → dist/
```

Both bundles are committed: `Demos/metamedium-core.browser.js` for the GitHub
Pages demo (`Demos/session-engine.html`), and `Demos/metamedium-core.node.mjs`
for what runs in Node — the MCP hands, the relay's test, the smokes. After
engine changes, rebuild both and re-copy them — CI fails if either drifts from
source.

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

### Sharing a room: say what your log is called

Node ids are derived from the **event that made them** — the log that wrote
the event and that event's own number in that log — so a mark has one id on
every machine, however the logs merged (ids per hand, SURFACE-v10-PLAN D8).
That needs the writing session to know its own name, which only the host
knows. Pass the same name the log file is written under, which is `mergeLogs`'
`me`:

```typescript
const session = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'john~a1b2' });
// or, when the host learns it later — joining a room, opening a folder:
session.setLogName('john~a1b2');
session.load(mergeLogs(logs, { me: 'john~a1b2' }));
```

**A log name is reused only when its whole history was loaded first**
(`src/session/hands.ts`), because the number an event mints comes from its
log. A folder's log is its file, loaded before anything is minted, so a folder
keeps one name. A live hand has no history to load, so its log is **one
sitting** — a page load, a process: `sittingName('john')` mints `john~a1b2`
once per sitting, and `handLabel` gives back the name a person sees. Within a
sitting the session's high-water mark only rises, whatever `load()` sees.

Say nothing and ids fall back to a counter over the replay, which is what
every log written before this rule carries and what every event of such a log
keeps: a held log opens as itself and is never renumbered. But two hands in
one room whose sessions have no names will each give the same event a
different id, and anything that refers to a mark by id — `canvas_say`,
`canvas_propose`, a model's own proposals — will land on the wrong mark. **A
host that shares a room must say its name.** `src/session/ids.test.ts` pins
both halves, the fix and the defect it closes.

## Module map

| Module | What it holds |
|---|---|
| `geometry` | fingerprinting, closure, corners, hull, bounds ops (ported from Web App Skeleton, behavior-identical) |
| `recognition` | the shape rung: Tier-0 detectors over a fingerprint, each with a grounded `reasoning` string |
| `relate/` | the relations the canvas can see between marks, every threshold a ratio of the marks' own size |
| `diagram/` | the diagram rung: what a mark plays (`roles.ts`), and a drawing's genre |
| `concepts/` | the meaning-mappings (row, column, frame, flow, grid, writing, …) and the conversions each affords |
| `session/` | the engine: events in, `SessionState` out (`session.ts`), the node model (`nodes.ts`), gestures and the command mark, erasing, clean forms, the maths of a mark, magnets, signatures, words from letters, sittings (`hands.ts`), late results refused (`stale.ts`) |
| `parse/` | the drawing as code: a layout by XY-cut (`layout.ts`), a graph (`graph.ts`), one plan for both (`plan.ts`), the scaffold |
| `tier1/` | the instant library: everything that answers with no model and no wait |
| `participants/` | a model's prompts and parsing (`agent.ts`), what it is told (`serialize.ts`), the router, the bridge, and the decision seat, tier 1.5 (`decide.ts`) |
| `llm/` | the one transport for the OpenAI-compatible servers, and Anthropic's |
| `store/` | the storage seam and its backends (a static site, a folder, a git repository), live rooms (`live.ts`), the merge (`merge.ts`) |
| `kinds/`, `frames/`, `behave/`, `image/` | artifact kinds and what ink over each addresses; frames wired by reference; the verb basis and its fit; pictures traced into ink |
| `maths/` | quantities, expressions, the sheet, dimensions, solving figure by figure, true size and tiled print |

### Plugging in an LLM tier (or any agent)

```typescript
const me = session.join('agent', 'claude-haiku', Date.now());
// Agents draw, lasso, check, and bless through the SAME calls as humans:
session.addStroke(points, Date.now(), me);
// Interpretations are attributed proposals — held, never auto-committed:
session.propose({
  participantId: me,
  nodeId: strokeId,
  edges: [{ to: 'type:circle', rel: 'resembles', weight: 0.92 }],
  at: Date.now(),
});
```

## Invariants (enforced by tests — keep them)

- Input is never refused; there is no mode.
- One class of citizen: humans, agents, and the engine's own recognizers are
  participants; every act is attributed; there is no separate AI channel.
- Interpretations are held (multi-parse), never auto-committed.
- A lasso is simultaneously content and gesture-candidate until the next event resolves it.
- A check **summons**; blessing is a separate act. Drawing past a summon dismisses it.
- Ink is never destroyed — members and gestures keep their nodes and reps.
- Every claim carries its author (`via`) and its justification (`reasoning`),
  so "why did you think that?" is answerable with no LLM in the loop.
- Everything starts at capability 0 (inert); escalation is a blessed act (v0.2+).

## Departures from the legacy heuristics (made knowingly)

- `checkOvershoot` is now size-relative (`min(50px, 20% of stroke size)`).
  The legacy fixed 50px threshold made strokes shorter than ~70px
  unrecognizable as lines. Covered by tests in geometry/recognition suites.

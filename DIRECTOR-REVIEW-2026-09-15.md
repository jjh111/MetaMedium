# MetaMedium — director review

Review date: 15 September 2026. Scope: local `control-points` at `1dd5e08`, including the untracked `shard-3d/` experiment. This is a review and implementation handoff, not an implemented patch. The worktree was already dirty and changed during inspection; rebase evidence against current source before coding. No application source was edited by this review.

## Direction

**Make the existing loops trustworthy and easy to discover before adding another rung.** The differentiator is already present: ink becomes addressable structure; deterministic operations answer first; models contribute through a constrained channel; the original ink and reasons remain available. Preserve that. Do not spend the next cycle on a framework rewrite, an embedding router, or more verbs.

The main surface and the 3D shard deserve separate delivery lanes. They share a core but are not two skins over the same finished product. Promote a mechanism from the shard only after its contract survives reuse and replay.

## What was exercised

- Main reference surface: `Demos/session-engine.html?fresh=1&nosw=1`, served locally in an isolated Chrome context. The actual `__setup()` / `__scenario()` harness returned **184 green records**. One record, `25d`, explicitly says it was skipped: report **183 exercised checks and one skip**, not 184 exercised tests. Model transport was stubbed.
- Main loop checked real DOM-to-ink alignment: the scenario reported **0 px worst drift** for its three regions and preserved the unaddressed region during revision.
- Main surface build: `node Demos/build-surface.mjs --check` returned **surface in sync**.
- Core suite: **590 tests across 52 files passed**, using Node 22.22.1; parent recheck of core typecheck was clean.
- Shard unit/typecheck/build: parent recheck passed **283 tests across 16 files**, typecheck and production build. The earlier independent audit had 261 tests; another active workstream added a 22-test view suite during review. Build emitted the existing bundle-size/deprecation warnings, not errors. Browser findings describe the earlier exercised snapshot, not a claim that every later edit was re-tested.
- Focused source probes reproduced erased-artifact resurrection and same-target binding inconsistency. Three parent-authored desired-invariant tests are intentionally red against current shard source: one-profile proposal Undo, sixteen-profile proposal Undo, and rejection of a malformed extrude tree. They expose missing coverage; they are not part of the existing green suite.
- Shard: a fresh, non-demo page passed **70/70 browser checks**; `__demo()` passed **9/9**. A completed mug and a library instance both reported no broken derivation.
- Extra probes: native mouse press-and-hold on main canvas, light/dark rendering captures, desktop-to-phone resizing, field bounds, mobile fit-to-content, and the completed shard's score/attribution text.
- No real model quality, real touch hardware, Safari, or Firefox verification was performed. Screenshots were captured in both themes; detailed visual analysis was available for light/empty/mobile views, not a complete contrast audit.
- An initial shard run on `?demo=mug` failed because the demo had already seated its stub. A fresh run passed. This was a test precondition mistake, not a reported application regression.

Browser evidence and runnable probes are in `/tmp/mm-director-audit/`: `main-e2e.json`, `shard-clean-e2e.json`, `shard-clean-demo.json`, `viewport-probe.json`, `review.mjs`, `verify-ui.mjs`, `viewport-probe.mjs`, and screenshots. These are local temporary review artifacts, not CI infrastructure.

## Shared implementation contract

Give each package to one implementing model. Every handoff must include: owned files, one failing regression, smallest fix, explicit non-goals, and exact verification output. A second model reviews the diff and reproduces the regression; it does not implement a competing version.

Preserve:

1. The log as source; ink and attribution remain recoverable.
2. Plural readings with reasons; no hard-coded winner as a shortcut.
3. Tier 1 before a model; no model request caused by draw/render/resize.
4. The single input field and stable verb slots; improve context rather than add tool modes.
5. The current brand tokens and published URLs.
6. Source/bundle drift checks. Edit surface fragments, not the generated script alone.

## QA-1 — Put the demonstrated behavior under a release gate

**Priority: first wave. Type: verified coverage gap.**

Evidence:
- `.github/workflows/ci.yml:8–55` checks core, bundles, the MCP smoke, surface concatenation and the Web App Skeleton. It does not execute either browser scenario or a shard job. Push CI is restricted to `master`; pull requests also trigger it.
- `Demos/session-engine.e2e.js:18–20` explicitly excludes the browser scenario from `npm test`.
- `shard-3d/package.json:7–12` has no browser-test command.
- Current main results allow an explicitly skipped record to be marked `ok`.

**Implementation brief:** Add a local browser-runner command and a CI job that starts disposable servers, opens fresh browser contexts, loads the existing scenarios, awaits their actual result, and exits nonzero on a failed assertion or harness exception. Save structured results and screenshots on failure. Keep injected stubs deterministic; block unintended live model requests. Run shard typecheck/unit/build gates too once that source is intentionally committed.

Start with Chromium; add a short WebKit interaction smoke rather than claiming a Chromium viewport test is an iPhone test. Split the large scenarios into independently set-up cases incrementally, without discarding the full-loop acceptance run. Count pass/fail/skip separately and name expected intentional sandbox exceptions explicitly instead of ignoring every page error.

**Own:** `.github/workflows/ci.yml`, new browser-runner/config files, minimal harness result adapters in both e2e files. Coordinate any shared package/lockfile edits through one owner.

**Acceptance:** A clean-checkout command runs both current scenarios without a human console; an injected failing assertion makes CI red; a stale stub from a demo URL cannot contaminate a fresh test; unexpected page errors fail; one skipped check remains visible as a skip. Real-model evaluation stays a separate opt-in lane.

**Non-goals:** Replacing every test with Playwright syntax, tuning recognition, calling paid APIs, or treating fake model outputs as model-quality evidence.

## UI-1 — Make the field and canvas respect the space actually visible

**Priority: first wave. Type: reproduced defect.**

Reproduction:
1. At 1440×1000, draw a rectangle and press-and-hold its edge to open the field.
2. Resize to 390×844 without dismissing the field.
3. The field remains at **x=504**, with its right edge at **878**: entirely outside the 390 px viewport.
4. Fit-to-content with the mobile bottom inspector visible sets zoom to **0.08**, treating that bottom sheet as a left sidebar.

Root cause:
- `Demos/surface/09-palette.js:575–586` positions the field once.
- `09-palette.js:593` returns early for the same summon ID, so resizing does not re-place it.
- `Demos/surface/01-view.js:136–140` repaints on resize but does not re-place the open field.
- `01-view.js:50–55` always treats the inspector's right edge as the left boundary of usable canvas, even when CSS docks the inspector at the bottom.

**Implementation brief:** Separate field content reconciliation from geometry updates. Reposition the existing DOM node on layout/visual-viewport changes, preserving input, focus, selection and scroll. Measure actual field dimensions after content layout instead of assuming a 230 px height. Introduce a small pure usable-viewport calculation that distinguishes side panels, bottom sheets and top chrome; use it for fit and popup placement. Handle the on-screen keyboard via `visualViewport` where available.

**Own:** `Demos/surface/01-view.js`, positioning/reconciliation portions of `09-palette.js`, targeted responsive rules in `surface.css`, and focused browser tests. Rebuild `Demos/session-engine.js`.

**Acceptance:** At 1440×1000 and 390×844, after resize and keyboard-height changes, the open field stays within visible bounds, typed text/focus survives, and Fit places content in the usable region without hitting minimum zoom just because the inspector moved to the bottom. Drawings do not move in world coordinates. Repeat both themes and both hand settings.

**Non-goals:** A permanent toolbar, silently closing the field, or clearing selection to force a rerender.

## GRAPH-1 — Separate source provenance from active instance constraints

**Priority: first wave for the shard. Type: reproduced semantic defect.**

Evidence from the completed 9-step mug demo:
- The placed mug (`artifact:14`) is valid, with a `place` operation and no broken geometry.
- Its panel says **“honours the drawing 20% · top 39 · top 0”**.
- The second comparison is against **source** `stroke:1`, at the original mug's position, not a constraint drawn at the new instance.
- `shard-3d/src/log.ts:2094–2095` chooses `steps[0].from` when there is no root massing operation; `2097–2115` compares every closed referenced mark at its own current plane/location. A `place` operation's references serve different roles; they are not interchangeable target constraints.

**Implementation brief:** Introduce an operation-aware query for the active constraints of an instance. Distinguish target sketch, template/source correspondence and subsequently drawn revision constraints. Either transform source constraints into instance space when semantically intended, or exclude them from target-space scoring while retaining provenance. Do not drop source IDs from the operation tree to hide the bug. Report the separate claims being measured; an intentionally cut hole can legitimately reduce silhouette agreement with an earlier filled outline.

**Own:** The relevant constraint query in `shard-3d/src/log.ts`; a small typed helper/module if warranted; operation types in `op.ts` only if needed; targeted unit tests and an end-of-demo browser assertion.

**Acceptance:** Translation/rotation/uniform scale of an equivalent placed instance does not lower agreement merely because its source sketch remains elsewhere. Tests cover original versus instance, a real mismatch in the target sketch, a later side-profile revision, and undo/replay. The completed mug never counts its untransformed source profile as a second zero-percent target view.

**Non-goals:** Hard-coding the demo score, calling every match 100%, removing provenance, or introducing a general constraint solver.

## UI-2 — Explain the current object before displaying its telemetry

**Priority: second wave. Type: product improvement plus a verified attribution bug.**

The completed shard devotes the first screenful of its inspector to mark IDs, point count, normals, fingerprint details and pixel maths; information about the selected solid and its definition appears farther down. The main empty state says “nothing here yet,” while the actionable start instructions sit in the bottom status line. These are useful engineering surfaces, but they make the new user's first successful loop harder to discover.

There is also a concrete provenance contradiction: on an engine-placed mug, the panel reports `held · the engine` and then “a model proposed it.” `shard-3d/src/panel.ts:260–268` uses that model sentence for every untaken version.

**Implementation brief:** Keep the panel and single field, but lead with a compact semantic summary: what is selected, what it could be, where it came from, and what the next deliberate act will do. Make “why / measurements” an expandable evidence section, not discarded information. Use typed provenance to distinguish engine operation, model proposal, human acceptance and reused definition. A reused model-authored definition should distinguish this operation's author from the definition's ancestry.

For the main empty state, place a small contextual example of the existing loop in the existing inspector: draw a few marks → hold one → choose what it becomes. Dismiss it naturally when content arrives. Preserve the calm canvas, no modal tour, no fixed tool palette, no new mode.

**Own:** `shard-3d/src/panel.ts` and `shard.css`; main inspector empty-state copy in `Demos/surface/10-inspector.js` and its narrowly scoped styles. Avoid simultaneous edits with UI-1 to shared styling without coordination.

**Acceptance:** Selecting a placed mug shows its name and reuse provenance without scrolling. The engine-only path never claims a new model call/proposal. The detailed reasoning and alternatives remain one action away. At narrow widths the panel and field do not hide each other's primary action. A first-time user can complete the basic loop without reading the architecture documents; validate that claim with a hand test rather than a screenshot alone.

**Non-goals:** Replacing the intentional monospace brand, removing ink, concealing alternatives, or changing the established tier semantics.

## SEAM-1 — Reduce cross-file coupling one tested boundary at a time

**Priority: after the regression gate. Type: bounded refactor proposal, not a demonstrated performance fix.**

Measured source sizes at review:
- `metamedium-core/src/session/session.ts`: 2,123 lines.
- `metamedium-core/src/participants/agent.ts`: 1,122 lines.
- `Demos/surface/09-palette.js`: 984 lines.
- `shard-3d/src/log.ts`: 2,380 lines; `main.ts`: 2,208 lines.

The main surface already has concern-based fragments, so “split the monolith” is not a useful assignment by itself. The remaining cost is that the fragments share one closure and hidden dependencies. A model can change a local function and accidentally alter another subsystem's assumptions.

**Implementation brief:** Select one boundary already under test—field query/affordance calculation is a good first candidate—and give it explicit typed inputs and outputs. Keep rendering and event dispatch at the adapter. Use named command/reading records rather than another shared global. Extract only that boundary, preserve current behavior, and show reduced implicit dependencies. Use the same approach for shard constraint queries after GRAPH-1, not a simultaneous rewrite of `main.ts` and `log.ts`.

**Own:** One pure helper and its unit tests, plus the narrow adapter in `09-palette.js`; generated bundles through existing build commands. A separate owner can later address a shard boundary.

**Acceptance:** The extracted query can be unit-tested without DOM/global session state; browser acceptance remains unchanged; no duplicate implementation remains; the bundle checks still pass. List exactly which former closure dependencies became parameters.

**Non-goals:** React migration, a new state library, changing event schemas just to facilitate refactoring, or wholesale TypeScript conversion of the surface.

## Integration notes

- Land QA-1 first or alongside a small demonstrated fix, not as an infrastructure-only detour.
- UI-1 and GRAPH-1 can proceed independently. UI-2 follows the relevant geometry/provenance fixes. SEAM-1 follows the gate and should absorb proven boundaries, not invent an architecture in advance.
- Models sharing `log.ts`, `op.ts`, the main palette or CI files must work serially or coordinate narrow commits; a logical package name does not prevent textual conflicts.
- Treat the current README and status claims as evidence to verify, not as a test oracle. Several documents still contain earlier counts and earlier completion summaries. Update only the affected status entry after real execution; do not create another competing architecture inventory.

## STATE-1 — A late result must not resurrect a deleted target

**Priority: immediate. Type: independently reproduced core defect.**

`metamedium-core/src/session/session.ts:1861–1883` checks that the node and participant exist, appends a code rep, then adds the node to `live`. It does not reject a node carrying an `erased` rep. Parent probe output: after erasure, `live=[]`; after `attachCode`, the erased artifact is accepted and `live=['artifact:9']`, with both `erased` and `code` reps. `Demos/surface/02-artifacts.js` renders the live list.

**Implementation brief:** Enforce target validity at the canonical mutation boundary, not only in the surface. Reject code attachment to an erased target and expose a nonfatal stale-result status. Check the analogous delayed-result paths for erase, reset/load and superseded revisions. If asynchronous request tokens are added, scope them by session generation and target/version, not a single global busy flag that prevents useful parallel work on unrelated objects.

**Own:** `metamedium-core/src/session/session.ts`, focused session/generation tests; caller status handling in `participants/agent.ts` only as needed. Rebuild the committed browser and Node bundles with existing commands.

**Acceptance:** Join an agent, request a deferred result, erase the target, resolve the result: no code accepted on the erased target, no live iframe, no unexpected history effect. Repeat with board reset/load and a superseded target version, stating the conflict policy. Explicit undo of the user's erase can restore the legitimate earlier artifact; it must not accidentally activate a discarded late response. Normal multi-participant proposals on valid targets still work.

**Non-goals:** Silently dropping all competing proposals, blocking the drawing loop, or assuming AbortController alone prevents every stale completion.

## ACT-1 — Undo semantic acts, not an arbitrary number of events

**Priority: immediate for shard reliability. Type: independently reproduced defect.**

`shard-3d/src/log.ts:654–699` guesses the end of an act by walking up to **12** individual undo events. It stops when a tree changes, even when model-created profiles belonging to that proposal remain below its code event.

The parent re-ran the real-source probe and wrote assertion-based regressions. With one generated profile, Undo restores the old tree but leaves that new profile visible. With sixteen generated profiles, Undo leaves all sixteen profiles and the **18-step proposal tree** standing. The existing unit suite does not catch either case.

**Implementation brief:** Give each synchronous user/model application an explicit action boundary. A proposal includes only its newly drawn profiles, their plane metadata, its code version and incorporation events. Undo reverts that action as a unit, not “until a shape count changes.” Keep pre-existing human ink and unrelated edits. Record the boundary when applying the result, not when starting a network request. Do not merely raise 12 to a larger constant or delete all model-authored marks.

Keep this bounded to the shard first. If the solution adds durable event metadata, specify backward-compatible replay for older logs before changing the shared core schema. That cross-surface contract change deserves architectural review rather than a worker deciding it incidentally.

**Own:** Shard action handling in `src/log.ts`, small action-group helper if required, tests in `log.test.ts` / `solids.test.ts` and targeted e2e cases. Coordinate `log.ts` ownership with GRAPH-1.

**Acceptance:** For one and sixteen generated profiles, one Undo restores the exact prior tree and removes only the profiles introduced by that proposal from the current board. Existing source ink, names and unrelated work remain. JSON replay preserves action grouping; undo of a human-drawn feature still leaves the human's circle; existing correction/definition undo semantics remain unchanged. Add delayed completion/interleaving cases.

**Evidence:** `/tmp/shard3d-audit/parent.repro.test.ts` and `parent-results.json`. The tests assert the desired behavior and currently fail. Earlier exploratory probes that merely printed values or used an unjoined model are not acceptance tests.

## DATA-1 — Validate the operation tree at every deserialization boundary

**Priority: immediate for shard load/import robustness. Type: independently reproduced defect.**

`shard-3d/src/op.ts:915–928` only checks the `mm` marker and whether `steps` is an array before casting JSON to `OpTree`. The accepted tree `{"mm":"op","version":1,"steps":[{"id":"s1","op":"extrude","from":["x"]}]}` lacks `depth`. `describeStep` calls `depth.toFixed()` at line 936 and throws. The parent reran both acceptance of the malformed object and the desired rejection regression.

**Implementation brief:** Write a dependency-light runtime validator from the actual discriminated operation types. Validate the format version, per-op required fields, finite numeric geometry, reference types, unique IDs, nested place trees and bounded depth/size. Do not confuse requirements between operations: a revolve uses its sweep/axis contract, not an extrude's depth contract. Return a structured reason; isolate a malformed artifact in the inspector and keep its raw rep recoverable rather than crashing the whole board or silently losing it.

**Own:** `shard-3d/src/op.ts`, `op.test.ts`, and the narrow load/display boundary needed to surface a broken-tree reason. No changes to recognition heuristics.

**Acceptance:** Deleting each required field from each valid operation either produces a clear validation failure or remains valid by an explicitly tested optional-field rule. Unsupported versions, bad references and excessive nesting do not hang or crash the board. Every accepted tree is safe to describe; valid round-trips retain exact semantics. A board with one bad artifact still permits selecting/drawing on other artifacts.

**Non-goals:** Executing a model's code, adding a heavyweight schema framework by default, or pretending compile-time TypeScript validates persisted JSON.

## BIND-1 — Specify the binding graph before implementing follow behavior

**Priority: after immediate fixes, before extending magnets. Type: reproduced inconsistency plus a contract decision.**

Parent reproduction: bind both ends of one stroke to different sites on the same rectangle. There are **two `bound` reps but one `bound-to` edge**, whose reason describes only the second endpoint. `metamedium-core/src/session/session.ts:1424` removes edges by target rather than endpoint. The current representation therefore loses part of the claim at the edge level.

**Implementation brief:** Explicitly choose one edge per endpoint, or a single edge carrying all endpoint bindings. Make the edge and rep queries agree. Then define the *active* relationship when a target is erased: retaining historical provenance is reasonable, but a consumer must not treat a tombstoned target as an active anchor. Do not automatically destroy provenance simply to eliminate a dangling-reference warning. Add bind coverage to JSON replay/checkpoint and merged-log tests before implementing “bindings that follow.”

**Own:** `session.ts` binding handling and `magnets.test.ts`; narrow node/edge type changes only if necessary; `replay.test.ts` and merge tests. Coordinate core ownership with STATE-1.

**Acceptance:** Same-target dual-end bindings preserve both sites and endpoint identities; rebinding one endpoint does not delete the other; erase/undo has an explicit active-versus-historical behavior; replay and merge preserve the same graph and attribution.

## Final dispatch order

1. **QA-1 plus STATE-1:** automate the existing scenarios while closing the erased-target hole. Independent runner/core file ownership.
2. **ACT-1 and DATA-1:** one shard owner per boundary; serialize overlapping `log.ts` integration. These can run alongside UI-1.
3. **UI-1 and GRAPH-1:** fix visible placement and evidence correctness; GRAPH-1 follows ACT-1's `log.ts` merge.
4. **BIND-1:** complete the graph contract before the next magnet behavior ships.
5. **UI-2, then SEAM-1:** make the correct system easier to understand and safer for models to modify.

Review each package with its failing regression, resulting diff and exact verification output. Do not assign the entire list to multiple models and merge whichever implementation finishes first. Choose bounded fixes, not feature expansion.

Lower-confidence audit suggestions about silhouette-cache growth, local credential-storage tradeoffs and duplicate-Enter concurrency were not promoted to confirmed findings here; they need focused measurement/reproduction before taking priority over the defects above.


# Build Plan — v8, the canvas as code

**Date:** 3 September 2026 · **Status:** ready to execute
**Design:** `ARCHITECTURE-v8-CANVAS-AS-CODE.md` (Parts I and II, decisions in §21)
**Rules of the house:** `CLAUDE.md` — read it first, every time

This is the plan a sub-contractor can execute from. Every work package (WP)
names the files it owns, the contract it must honour, the tests it must
write, and what "done" means in one checkable sentence. Packages that own
disjoint files run in parallel; the ones that touch the surface run as a
weave, one at a time, because the surface is one file until WP-0 lands.

---

## 0. Invariants — the things no package may break

These are already true and are enforced by tests that must stay green.
A package that needs to change one stops and says so.

| # | Invariant | Enforced by |
|---|---|---|
| I1 | State is a pure function of the event log. `load(events)` reproduces any state. | `replay.test.ts`, `session.scenario.test.ts` |
| I2 | Ink is never destroyed. Every transform, clean form, transcript, or grouping is a rep beside the stroke; undo drops the rep. | `tidy.test.ts`, `clean.test.ts`, `words.test.ts` |
| I3 | Nothing commits without a blessing. Every reading, name, behaviour or code from any tier is held, attributed, and unblessed until a human acts. | `session.participants.test.ts`, `agent.test.ts` |
| I4 | Every claim carries its reasoning, in the terms it was measured in. | reasoning fields on readings, relations, roles, verbs |
| I5 | Thresholds are ratios of the marks' own size, or in the hand's space (scaled by 1/zoom). No fixed world-pixel constants. | `relations.test.ts`, `commandmark.bench.test.ts`, `words.test.ts` |
| I6 | Closed vocabularies: shapes (8), roles (6), genres (4), code kinds, verbs. A vocabulary grows by adding a row to a table with a test, never by a special case. | `roles.test.ts`, `synthesize.test.ts` |
| I7 | The benches never regress: 99.8% shape reading over 1,674 strokes, 100% check acceptance with zero false fires, zero wrong snaps. | `recognition.bench.test.ts`, `commandmark.bench.test.ts`, `clean.bench.test.ts` |
| I8 | Declared content never gestures; a model's marks are declared content. | `draw.test.ts` |
| I9 | Nothing runs unblessed. Pages keep `allow-same-origin` without scripts; `js` runs in a worker after a bless. | new, WP-8 |
| I10 | The committed browser bundle matches a fresh build. | CI drift check |
| I11 | **No domain concept is hard-coded anywhere in the engine or the surface.** "Fish", "coral", "food", "page", "slider" are things a *user* names; the engine knows shapes, roles, verbs, kinds and relations, and nothing else. When this plan says "fish" it is giving an example of what a user might draw and name, never a type to implement. Test fixtures use generic names (`definition A`, `target-b`); a fixture named after a domain thing is a smell. | review; grep for domain words in `src/` |

**Definition of done for every package:** `npm run typecheck`, `npm test`
(all 468+ tests) and `npm run build:browser` green; the bundle copied to
`Demos/`; the e2e (`Demos/session-engine.e2e.js`, 60 steps) still passes
in a browser when the package touched the surface; CLAUDE.md updated in the
same commit when a structure changed; a commit message that says what was
learned, not only what was done.

---

## 1. Contracts — the interfaces packages build against

Fixed now so packages can be written independently. A package that must
change a contract stops and says so in its report.

### 1.1 Events (additions to `SessionEvent` in `session/session.ts`)

```ts
| { type: 'select';   ids: string[]; at: number }                   // WP-2
| { type: 'deselect'; at: number }                                  // WP-2
| { type: 'move';     ids: string[]; dx: number; dy: number; at: number }         // WP-2
| { type: 'scale';    ids: string[]; about: Point; sx: number; sy: number; at: number } // WP-2
| { type: 'rotate';   ids: string[]; about: Point; radians: number; at: number } // WP-2 (writes 'transform' reps; rotation held as 'rotation' rep)
| { type: 'clock';    nodeId: string; op: 'play' | 'pause' | 'reset' | 'seed'; seed?: number; at: number } // WP-5
| { type: 'behave';   nodeId: string; behaviour: Behaviour; participantId?: string; at: number }          // WP-6 (held rep, unblessed until bless)
| { type: 'import';   kind: Kind; path: string; bounds: Bounds; strokes?: Point[][]; at: number }          // WP-9
| { type: 'frame';    ids: string[]; name: string; connections: Connection[]; at: number }               // WP-10
```

`SessionState` gains `selection: string[]`, `clocks: Record<nodeId, {t, playing, seed}>`.

### 1.2 Reps (new modalities)

`'rotation'` (radians about the mark's centre), `'behaviour'` (see 1.4),
`'clock'`, `'image'` ({path, width, height}), `'control'` ({kind, value, min,
max}), `'text'` ({text, style}), `'frame'` ({members, connections}),
`'snapshot'` (a data URL, surface-only, never in the log).

### 1.3 Kinds (closed)

`html`, `js`, `json`, `svg`, `md`, `png`, `jpg`, `text`, `control`. Every
kind has a renderer and an addressing scheme (`regionsOf` equivalent) or it
is not a kind. Table lives in `src/kinds/kinds.ts` (WP-7).

### 1.4 The verb basis (`src/behave/verbs.ts`, WP-4)

```ts
export type Verb = 'wander' | 'seek' | 'flee' | 'home' | 'school' | 'hold' | 'avoid' | 'consume' | 'spawn' | 'drift' | 'expire';
export interface Term { verb: Verb; target?: string; weight: number; params?: Record<string, number>; reasoning?: string }
export interface Behaviour { terms: Term[]; source?: 'words' | 'demo' | 'hand' | 'model'; language?: 'js'; code?: string }
export interface World { t: number; dt: number; me: Body; others: Body[]; walls: Wall[]; named(name: string): Body[]; rng(): number }
export function force(term: Term, world: World): { fx: number; fy: number; reasoning: string }  // one verb, one force
export function steer(b: Behaviour, world: World): { fx: number; fy: number; terms: TermResult[] }  // the sum, clamped
export function fit(demo: Sample[], basis: Verb[], world: WorldAt): { terms: Term[]; residual: number; explained: Record<Verb, number> } // least squares with L1 sparsity
```

`fit` biases toward the fewest terms that explain the demonstration
(decision §21.1): an L1 penalty on weights, swept, and the sparsest fit
within 10% of the best residual wins. Not keyframes; rules.

### 1.5 The storage seam (`src/store/seam.ts`, WP-11)

```ts
export interface Store {
  list(): Promise<Entry[]>;                          // discovery: every file of a known kind, recursively
  read(path: string): Promise<Uint8Array | string>;
  write(path: string, data: Uint8Array | string): Promise<void>;   // rejects on a read-only backend
  appendLog(participant: string, events: SessionEvent[]): Promise<void>;
  readLogs(): Promise<Record<participant, SessionEvent[]>>;
  capabilities(): { write: boolean; watch: boolean };
}
```

Backends: `StaticStore` (fetch, read-only), `FolderStore` (File System
Access), later `GitStore`. The merge of logs is `mergeLogs(logs) →
SessionEvent[]` ordered by `at`, ties by participant id, and is a pure
function with a test.

### 1.6 The palette item (surface, `Demos/surface/09-palette.js`, WP-3)

```js
{ key, label, why, tier: 0|2, scope: 'mark'|'these'|'board'|'artifact', likelihood: 0..1, run(btn) }
```

Ranking = `likelihood × (1 + log(1 + uses))` where `uses` comes from
`library/palette-counts.json`.

---

## 2. Work packages

Order is dependency order. **P** marks a package another model can take in
parallel with anything else at the same level. **W** marks weave: serial, on
the surface. Each has an owner slot; JH assigns.

### Level 0 — enable parallel work

**WP-0 · Split the surface into fragments** (W, me) ✅ **done 3 Sep 2026**
`Demos/session-engine.html` was 2,800 lines in one file. It is now
`Demos/surface/surface.css` plus thirteen script fragments (`00-core` …
`12-boot`), one concern each, concatenated in name order into one closure by
`Demos/build-surface.mjs` → the committed `Demos/session-engine.js`, with a
CI drift check like the engine bundle's. Not ES modules: the closure's shared
state is used by every concern and there is no JS parser in the toolchain to
rename bindings safely, so fragments reached the goal — several people on
the surface at once, in disjoint files — with zero behaviour risk. Each
fragment's header names what it provides and uses, so extraction into real
modules later is mechanical. Behaviour identical; e2e 60/60 after.
*Surface packages own fragments:* WP-3 → `05-snap` (to become `05-selection`) and `09-palette`; WP-8 → `02-artifacts` plus a new `13-kinds`; WP-5/6 → new `14-clocks`, `15-behave`; WP-10 → new `16-frames`; WP-11 → new `17-folder`; WP-9b → new `18-images`; WP-13 → new `19-text`.

### Level 1 — the foundations (all P once WP-0 lands; engine packages are P now)

**WP-1 · Checkpoints and log merge** (P, engine) ✅ **done 3 Sep 2026** — `checkpoint` snapshots every 200 events inside `session.ts` (structured clone; discarded past a cut), `mergeLogs` in `src/store/merge.ts`. *Found on the way:* relations were computed for the whole board on every stroke — quadratic per stroke, cubic per session — which made undo on a few hundred marks take seconds; now the new mark is related pairwise, linear per stroke, same relations. The per-pair cost is dominated by crossing tests over full point lists when bounds overlap; a spatial index and simplified outlines for the crossing test are the next scaling steps (WP-11's live budget).
Files: `src/session/checkpoint.ts`, `src/store/merge.ts`, tests.
Checkpoint state every K events (K=200) as a structured clone; `load` and `undo` replay from the nearest checkpoint. `mergeLogs` per 1.5. Determinism test: two merges of the same logs in different order give identical state.
*Done:* replaying a 5,000-event log after undo takes under 50 ms in the test runner; merge is order-independent.

**WP-2 · Selection in the engine** (P, engine)
Files: `src/session/selection.ts`, events per 1.1, `session.ts` reducer cases, tests.
`select`/`deselect`/`move`/`scale`/`rotate`. `move` and `scale` write `transform` reps (compose with existing); `rotate` writes `rotation`; `cleanPointsOf` and `strokePointsOf` honour rotation. A summon's resolution emits `select` for the enclosed ids and drops the loop from content. Undo of `deselect` restores selection.
*Done:* select three, move, scale, rotate, deselect, undo; positions and selection match the spec; I2 holds (raw points untouched).

**WP-4 · The verb basis and the fit** (P, engine, pure math) ✅ **done 3 Sep 2026** — `src/behave/{verbs,steer,walls,fit}.ts`; eleven verbs as forces or intents with reasons; steering summed, clamped, stepped; walls as physics (slide, redirect at full magnitude, disengage); the fit recovers a two-verb mix from an uncapped path within 10% and fits one verb to a one-verb path. *Found:* `home` is `seek` until arrival, so the fit takes `seek` and lets the human refine; a demonstration made under a speed cap biases a linear fit — hands have no cap, generators must not either.
Files: `src/behave/verbs.ts`, `src/behave/steer.ts`, `src/behave/fit.ts`, `src/behave/walls.ts` (the wall rules are ported from the personal site's `fish-engine.js` `applyWallPhysics` — the *physics* is what is borrowed, not the fish; the port must not carry any size class, species or name), tests per verb, a fit test that recovers a known mix from a synthetic demonstration with under 10% error, and a sparsity test (a demo explainable by two verbs fits two, not five). Every verb takes its target as a *name supplied at run time*; there are no built-in names.
*Done:* every verb has a force test with reasoning; `fit` recovers synthetic mixes; walls redirect rather than zero velocity; no DOM, no session imports.

**WP-7 · Kinds and renderers, headless part** (P, engine) ✅ **done 3 Sep 2026** — `src/kinds/kinds.ts` (the closed table: nine kinds, each with a renderer and an addressing scheme) and `src/kinds/address.ts` (`js` by top-level declarations, brace-matched and string-aware; `json` by keys with dotted paths; `md` by heading sections; `svg` by the root's direct elements; `text` by paragraphs); ids stable across edits that do not reorder.
Files: `src/kinds/kinds.ts` (the table), `src/kinds/address.ts` (addressing per kind: `js` → functions by brace-matching, `json` → keys by path, `md` → headings/paragraphs, `svg` → top-level elements), tests.
*Done:* `addressablesOf(kind, source)` returns regions with stable ids for each kind, tested on fixtures.

**WP-9a · Image tracing** (P, engine, pure) ✅ **done 3 Sep 2026** — `src/image/trace.ts`: luminance → Otsu (inverted when most of the picture reads as ink, so a chalkboard works) → Zhang–Suen thinning → the skeleton walked into paths (free ends, then junctions taking the straightest branch, then loops) → Douglas–Peucker at 1.5 px → densified to ink spacing, because the engine measures along the path and a polyline that is only its corners has nothing between them to measure. Three painted boxes read as three rectangles; a painted sketch with a wobbling pen, a gradient ground and flecks yields ≥ 80% of its shapes. *Honest gap:* the fixture is painted, not photographed — a committed photo of paper is the next fixture, and the surface (WP-9b) is where it will be tried on real pictures.
Files: `src/image/trace.ts` — bitmap (ImageData-like) → strokes. Threshold, thin, trace contours, simplify. No canvas API in core: takes `{width,height,data}`; the surface supplies pixels. Test on a synthetic 3-box bitmap → three closed strokes the shape rung reads as rectangles.
*Done:* the fixture traces to marks the engine reads correctly; a photographed-sketch fixture (committed PNG, decoded in a test via a tiny PNG reader or a pre-decoded JSON) yields ≥ 80% of its shapes.

**WP-12 · Structural signatures** (P, engine) ✅ **done 3 Sep 2026** — `src/session/signature.ts`: a signature is two bags, the shapes and the LINKS between them (engaging relations keyed by the shapes at each end; positional relations left out, so a group on its side is the same group); similarity 0.6 shapes + 0.4 links with reasoning; `matchesOf(ids)` ranks every definition above `MATCH_FLOOR`, plurally; the `correct` event adds the group's signature to the definition's accepted or rejected examples, a rejected twin vetoes with the correction as the reason, an accepted example matches on its own; an open summon on those marks re-reads its offers. Surface: *Not a …* beside *It's a …* in the palette (e2e 17c–17e), the candidate label names every match. Fixtures A and B: a circle with two lines inside it, and a circle with two lines crossing it.
Files: `src/session/signature.ts` — from histogram to a small graph (shapes + engaging relations); similarity with reasoning; `correct` event (`{type:'correct', ids, definitionId, at}`) that adds to accepted/rejected sets on the definition; tests: two user-named definitions with the *same* type histogram but *different* structure (say, a circle with a triangle touching it, and a circle with two lines inside it) are told apart, and a wrong match is corrected once and stays corrected. Fixtures are named `A` and `B`; the engine never learns the words.
*Done:* `clusterCandidates` ranks matches plurally with reasoning; the correction test passes; existing `session.scenario.test.ts` unchanged.

### Level 2 — the surface, as a weave (W, after WP-0; one at a time)

**WP-3 · Selection and the blob palette on the surface** (W) ✅ **done 3 Sep 2026** — selection in `05-selection.js` (e2e step 18); the blob in `09-palette.js`: rings from the pen tip, contextual offers above every generic verb, learned use capped, pills relaxed apart so none overlap, two rings on a phone
Files: `Demos/surface/held.js` → `selection.js`, `palette.js`. The loop becomes an outline with handles; drag/scale/rotate emit WP-2 events; the dead state (a tap dismisses, never dots). Ring packing from the pen tip: 2, then 4, then 8, by likelihood × learned use; fuzzy text; free text to the model. E2E steps for S1 and S2 criteria in v8 §19.
*Done:* the S1 and S2 criteria pass in the e2e; every existing palette verb is reachable within two rings.

**WP-8 · Kinds on the surface, and the worker** (W)
Renderers for `js` (source, function by function), `json` (keys), `md`, `svg`; the worker runtime for `js` under the `steer` contract; I9 enforced (a bless before run).
*Done:* a `js` artifact renders addressable; a behaviour runs in the worker; a throwing behaviour marks its artifact broken and the board survives (e2e step).

**WP-5 · Clocks and instances** (W, needs WP-2, WP-4, WP-8)
`clock` events; `state.clocks`; instances with runtime state; fixed-step loop in the surface; wander as the built-in; determinism e2e (reset twice, same positions).
*Done:* Part I stage A criterion.

**WP-6 · Words into verbs, and acting it out** (W, needs WP-4, WP-5)
`agent.behave`; `parseBehaviour`; the label's transcript as the brief; the palette's *Give it this behaviour*; the demonstration path: drag a selected instance while a clock runs → `fit` → a held behaviour with per-term reasoning and the residual named. The ladder in the panel: words → sliders → flow → source.
*Done:* Part I stage C criterion, plus: act out "flee the big one" and the fit's top term is `flee` with the big one as target.

**WP-10 · Frames** (W, needs WP-7, WP-8, WP-12)
`frame` event; connections offered from members' interfaces; the `control` kind (a drawn slider: a line with a dot reads as a slider); escalate to folder; export bundle; conjure by name and resemblance.
*Done:* the SNA criterion (v8 §19 S5).

**WP-11 · The folder** (W, needs WP-1)
The seam, `StaticStore` and `FolderStore`, discovery, per-participant logs, autosave, the live budget with snapshots, grid and focus views.
*Done:* v8 §19 S4 criterion: this repo opened as a canvas; ink on a demo is a file; a second machine sees it after a pull.

**WP-9b · Images on the surface** (W, needs WP-9a, WP-11)
Import (file, drag, paste, camera on a phone); decode → trace → `import` event with strokes; the raster as an `image` artifact; SVG import; export kinds. SAM on request later, behind a flag.
*Done:* v8 §19 S6 criterion.

**WP-13 · Text as an element** (W)
The `text` kind with an editor; convert a written word to it on request; a page heading typed on the canvas.
*Done:* v8 §19 S3 criterion.

**WP-14 · Deploy** (W, last)
PWA manifest and service worker (offline, installable); the `GitStore` adapter behind a flag; README section "open a folder as a canvas".
*Done:* v8 §19 S7 criterion.

---

## 3. The parallel plan

Threads that can run at once, because they own disjoint files and build
against the contracts in §1:

| Thread | Packages | Who | Touches |
|---|---|---|---|
| A | WP-0 | me (serial, first) | `Demos/` |
| B | WP-1, then WP-12 | model 1 | `src/session/checkpoint.ts`, `src/store/`, `src/session/signature.ts` |
| C | WP-4 | model 2 | `src/behave/` |
| D | WP-7, then WP-9a | model 3 | `src/kinds/`, `src/image/` |
| E | WP-2 | model 4 | `src/session/selection.ts` + reducer cases (the one shared file: `session.ts`; land it first, before B's signature work touches the same file) |

After A lands, the weave (WP-3 → WP-8 → WP-5 → WP-6 → WP-10 → WP-11 → WP-9b
→ WP-13 → WP-14) runs one package at a time on the surface; each integrates
one or more of the engine packages that are already green.

**Shared-file rule.** `src/session/session.ts` and `src/index.ts` are the
only files two threads both need. Thread E owns `session.ts` until WP-2
lands (about a day); thread B rebases its reducer case on top. `index.ts`
export lines are added by each thread in its own commit and merge cleanly.

**Branching.** One branch per thread from `next-phases`; rebase onto
`next-phases` before opening a PR; I integrate. No thread pushes to master.

---

## 4. Briefs for sub-contractors

Each brief is self-contained. Paste it to a model with repo access.

> **Common preamble.** You are working in `metamedium-core/` of the
> MetaMedium repository. Read `CLAUDE.md` in full first, then
> `ARCHITECTURE-v8-CANVAS-AS-CODE.md` §21 and the section of
> `BUILD-PLAN-v8.md` for your package. Honour every invariant in §0 of the
> build plan; if you need to change one, stop and report. Write tests
> first, in the style of the neighbouring `*.test.ts` files: each test's
> name says what is true and why. Keep the zero-dependency rule. Every
> threshold is a ratio of the marks' own size or in the hand's space. Every
> claim the code makes carries a `reasoning` string in the terms it was
> measured in. Run `npm run typecheck && npm test` green before you stop,
> then `npm run build:browser` and copy `dist/metamedium-core.browser.js`
> to `Demos/`. Commit on your branch with a message that records what you
> learned. Do not touch `Demos/session-engine.html` or any file outside the
> ones your package owns. Report: what you built, what surprised you, what
> contract you would change and why.

**Brief B (WP-1 then WP-12).** Build `src/session/checkpoint.ts`: the
session snapshots its state every 200 events (structured clone of nodes,
contentIds, artifacts, live, participants, explanations, pendingLasso,
summon, commandMark, counter); `load` and `undo` replay from the nearest
checkpoint at or before the target length. Test that replay from a
checkpoint equals replay from zero on the scenario test's log, and that
undo on a 5,000-event synthetic log runs under 50 ms. Then
`src/store/merge.ts`: `mergeLogs(logs: Record<string, SessionEvent[]>)`
ordered by `at`, ties by participant id, pure, with a test that merge is
order-independent. Then WP-12 per §2: signatures as small graphs, similarity
with reasoning, the `correct` event, two generic definitions with the same
histogram and different structure told apart after one correction (I11:
name the fixtures A and B, not after anything). Do not change `clusterCandidates`' shape; add a
`reasoning` and keep `matches` plural.

**Brief C (WP-4).** Build `src/behave/` per contract 1.4. Port wall physics
from `/Users/johnhanacek/Documents/GitHub/johnhanacek/scripts/fish-engine.js`
`applyWallPhysics` (lookahead slide, redirect-not-zero containment,
sustained-contact disengage) into `walls.ts` with tests that a body in
contact with a wall is never stationary. `fit.ts` is least squares onto
the verb basis with an L1 sweep; the sparsest fit within 10% of the best
residual wins; the result carries `explained` per verb as reasoning. Test:
synthesize a path from `seek target-a 1.0 + flee target-b 1.4` against a
world of generically named bodies, fit it, recover the two terms within 10%
and no third term above 0.1. Targets are names the world supplies at run
time; nothing in `src/behave/` knows any particular name (I11). No DOM, no session
import; `World` is a plain object.

**Brief D (WP-7 then WP-9a).** Build `src/kinds/kinds.ts` (the closed
table: kind → renderer name, addressing function, export mime) and
`src/kinds/address.ts`: `addressablesOf(kind, source)` returns
`{id, label, start, end}[]` — `js` by top-level functions and exported
consts (brace-matched, string- and template-aware, like `outermostObject`
in `participants/agent.ts`), `json` by top-level keys with dotted paths for
nested objects, `md` by headings, `svg` by top-level elements. Ids are
stable across edits that do not reorder. Fixtures and tests per kind. Then
`src/image/trace.ts`: `{width,height,data}` → `Point[][]` via threshold
(Otsu), thinning (Zhang–Suen), contour following, Douglas–Peucker
simplification at 1.5 px. Test on a synthetic 3-box bitmap and on a
committed JSON of a real photographed sketch's pixels; the engine reads ≥
80% of its shapes.

**Brief E (WP-2).** Add the five selection events per contract 1.1 to
`src/session/session.ts` and `src/session/selection.ts`; `state.selection`;
a summon resolution emits `select(enclosedIds)`; `deselect` clears; `move`
and `scale` write `transform` reps composed with any existing transform
(read `applyTidy` for the shape of that); `rotate` writes a `rotation` rep
and `strokePointsOf`/`cleanPointsOf` apply it about the mark's centre. Undo
of `deselect` restores the selection with positions untouched. Tests in
`selection.test.ts`. Do not touch gesture resolution beyond the one
`select` emission; do not touch `Demos/`.

**Brief Q (QA, hand-sized — report only, no edits).** You are testing, not
building. Serve the repository root (`python3 -m http.server 8000`) and
open `http://localhost:8000/Demos/session-engine.html` in the branch
`next-phases`. Do NOT edit any file; your deliverable is a written report.
The 3 Sep 2026 regression (three small bubbles and two lines folding into
one "word") was missed because the e2e draws shapes far larger than a hand
does, so this pass is about the sizes and speeds a hand actually uses.
Drive the page through real pointer events at the canvas (the helpers in
`Demos/session-engine.e2e.js` — `__helpers()` gives `__t.stroke`,
`__t.circle`, `__t.rect`, `__t.check`, `__t.word` — dispatch to the canvas;
prefer the browser's own drag tools where you have them). Run each scenario
below at three sizes (marks ~35 px, ~80 px, ~200 px on screen), at three
zooms (fit, 0.5×, 2× via the rail's − and +), with a mouse, and at the phone
preset (375×812). Scenarios: (1) the canonical loop — draw three circles
and two lines, circle them, cross with the check, name it "A", draw the
same again and confirm it is recognised; (2) teach a mark — open *Teach a
mark…*, draw a caret five times, *Use this mark*, close, then use it in
place of the check; reload and confirm the rail chip shows the caret and
the mark still works; (3) write a word (a cursive squiggle, then printed
capitals stroke by stroke) beside a box, circle both, and read the palette;
(4) circle a group, take *Draw them clean*, then drag the selection, scale
a corner, tap off, undo; (5) scratch out a mark with three passes; (6)
snap `auto`, then draw at each size. For every step record: what you did
(coordinates and sizes), what the status bar said, what the panel said,
what the palette offered, and a screenshot when something looked wrong.
Report as a table: scenario · size · zoom · device · pass/fail · what
happened · what you expected. Also list anything that looked like a
"claude-ism" in the panel's wording, any console error, and any place the
UI covered another UI (the panel over the teach pane, a pill off screen).
Do not fix anything, and do not lower a bar to make a row pass.

---

## 5. Risks, and what we do about each

| Risk | Mitigation |
|---|---|
| The surface file is a merge bottleneck | WP-0 first; then one surface package at a time |
| The fit overfits a demonstration to five verbs | L1 sweep, sparsity test, residual shown to the human |
| A `js` behaviour hangs the board | worker with a time slice; broken-artifact status; I9 |
| Per-participant logs diverge across machines | merge is a pure function; test order-independence; conflicts impossible by construction |
| Tracing produces mush from a photo | keep the raster; only strokes the shape rung reads with confidence ≥ 0.6 become marks; the rest stays an image |
| Scope creep into a general IDE | the kinds table is closed; a kind with no renderer is refused |
| A sub-contractor changes a contract silently | briefs say stop and report; PR review checks §1 |
| The e2e grows past 60 steps and slows | split into scenario files per stage; each under 20 s |

---

## 6. What "space-flight ready" means here

Before any of this merges to master: the invariants in §0 green; the e2e
green in Chrome at desktop and phone sizes; a recording of each stage's
criterion as a replay in `Demos/recordings/` so the paper can show it; and
CLAUDE.md telling the next reader what changed. Before it ships as the
flagship: the deploy in §WP-14 running on Pages read-only, a folder session
in Chrome, and one round trip through git between two machines.

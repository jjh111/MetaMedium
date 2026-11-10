# CLAUDE.md

This file guides Claude Code (claude.ai/code) in this repository. It is deliberately short: it is loaded into
every session and every agent. The engineering reference lives in `docs/` — **read the topic file before you
touch its area** (the index is below). Keep this file under about 25 KB; put detail in the topic files.

## Project Overview

**The product is dyna.ink** (formerly MetaMedium; renamed 2 Oct 2026, `RENAME-PLAN.md` — §1 holds the
spellings). The repository, its GitHub Pages address and what the plan's §2 lists keep the old name.
The rename's N0, N1, N2 (the AGPL-3.0: `LICENSE`, `NOTICE`, `scripts/rights.test.mjs`) and N3a–N3e are on
`master`. What remains of it (23 Oct 2026): **N4**, dyna.ink as the address — its edits listed and held by
`scripts/n4.mjs`, a dry run until `--apply`, which waits for dyna.ink to answer after John's Cloudflare steps;
**N5**, the release; and the plan's **H1** (the organisation — not V1-PLAN's H1, the hand in the gate), whose
transfer of this repository `NEW-REPO-PLAN.md` replaces (its §2, John's to confirm): the old repository is never
transferred, and dyna.ink starts as a new repository seeded from this milestone.

**dyna.ink** is a recombinatorial drawing system: interfaces that learn user
vocabularies, recognize compositional patterns in real-time, and evolve through
use. Strokes are grounded geometrically (fingerprints, spatial graphs), users
name what they draw, names compose recursively, and LLMs interpret over that
grounded substrate ("AI as meta-word" — see the interactive whitepaper at
`index.html`, published at https://jjh111.github.io/MetaMedium/).

The canonical loop that proves the thesis: draw circle → save as "bubble" →
draw 3 bubbles + 2 lines → save as "molecule" → system recognizes "molecule"
automatically → ask "why?" and get grounded reasoning.

## Current status

**The multiuser milestone** (branch `claude/loving-maxwell-zagdqy`, from `master` at 6f541ef; 23–26 Oct 2026):
the demo tied up as a web app several people use at once. Rooms anyone can open by a link, dyna.ink's own models
with no key in any browser (Cloudflare's Clef-flash as the decider; a writer and a reader through Workers AI),
another hand's code run only after *Play it here* and sealed, the deploy waiting for CI, and a UX pass. Nothing
has reached Cloudflare, dyna.ink or relay.dyna.ink, and WebKit has not run it. What comes next is
`NEW-REPO-PLAN.md`: a new repository, `dyna.ink`, seeded from this milestone; this repository is never
transferred and keeps serving the old address.

- **`docs/STATUS.md`** — the dated history, unit by unit, and the list of every plan document.
- **`V1-SPEC.md`** — v1 as specced (the diagrammatic notebook that runs); its units and ladder are what is built next.
- **`MVP.md`**, **`KEYFRAMES.md`**, **`ROADMAP.md`** — the product, the three rungs, the accounting.
- **`RENAME-PLAN.md`** §1 — the one home of the product's spellings (dyna.ink, formerly MetaMedium).
- Releases, deploys and pushes to `master` happen only on John's word.

## Repository map

The full inventory, with what each path holds and why, is **`docs/REPOSITORY-MAP.md`**. In short:

| Path | What it is |
|---|---|
| `core/` | **The canonical engine** (`@dynaink/core`, TypeScript, zero deps, tested). New engine work lands here |
| `Demos/surface/` | **The reference surface's source**: script fragments concatenated in name order into one closure → `Demos/session-engine.js` (committed, drift-checked). A fragment's `.test.mjs` runs in Node |
| `Demos/` | `session-engine.html` (the app's page), the committed core bundles, `sw.js`, the MCP hand (`mcp.mjs`), the Node relay (`relay.mjs`) and the protocols both relays read |
| `app/` | **The app's address** (`/app/`). Made by `scripts/build-app.mjs`, never edited |
| `cloudflare/` | The site build for Pages (`build-site.mjs`) and the room relay Worker (`relay/`) with the model routes |
| `e2e/` | **The browser gate**: `node e2e/run.mjs [scenario…]`; `e2e/README.md` has the scenarios |
| `scripts/` | The app build, the release, and the tests that read strings (`name`, `words`, `rights`) |
| `boards/` | Boards kept as logs: the generated examples, the story, the storyboard |
| `docs/` | The engineering reference this file indexes |
| `index.html`, `stories/`, `brand/`, `Assets/` | The whitepaper, its stories, the visual system (`brand/tokens.css` is its one home) |
| `dynaink-3d/` | DynaInk3D, the bounded 3D shard (its README is its single source) |
| `HELP.md` | The help pane's page, for a person. Keep it true to the surface |
| `archive/`, `lens-canvas/`, `v2-poc/`, `gliner-seat/`, `launch-video/`, … | Retired versions and experiments (`EXPERIMENTS.md`) |

**Known duplication:** recognition logic still exists in `doodle2-canvas.html`, `metadoodle1.html`,
`Web App Skeleton/src/core/` and `v2-poc/bundle.js`. `core/` is canonical; the legacy copies get no new logic.

## The engineering reference

Each file holds whole sections moved from this file, under their old titles, so a comment that says
*Rooms anyone can open* or *Living artifacts* still names a section you can find (`grep -rn "^## " docs/architecture`).

| Read | Before touching | Sections |
|---|---|---|
| `docs/architecture/recognition.md` | recognition, fingerprints, detectors, clean forms, `measure`, `core/src/maths/` | *Core Data Model* · *Recognition Engine* · *The maths of a mark* · *Clean forms* · *Spatial Graph — retired* |
| `docs/architecture/gestures.md` | the command mark, the field and its reader (`09-field.js`, `09-palette.js`), loops, summons, scratching to erase | *Gestures* |
| `docs/architecture/tools-context-packs.md` | `core/src/tools/`, `core/src/context/`, `core/src/packs/`, what the field offers and in what order | *Tools* · *Context* · *Library packs* |
| `docs/architecture/editing.md` | magnets, `bind`, `follow.ts`, `route`, handles and `reshape`, regions | *Magnets and bindings* · *Routing* · *Handles* · *Regions* |
| `docs/architecture/relations-diagrams.md` | `relate/`, concepts, roles, any notation, Mermaid out or in, the garment piece | *Relations and concepts* · *The diagram rung* · *The state diagram* · *The ER diagram* · *The mind map* · *The garment pattern piece* |
| `docs/architecture/artifacts.md` | pages, programs, frames, sandboxes, clocks and tanks, text, *Play it here* | *Parsing* · *Living artifacts* · *Time* · *Text as an element* · *Frames* · *Programs, and the library first* · *The model holds a pen* |
| `docs/architecture/models.md` | any model call, seats, the decider, the house models, the models pane, handwriting | *Tiered LLM Interpretation* · *Handwriting* |
| `docs/architecture/boards-storage.md` | the journal, boards, folders, the service worker, `/app/`, releases, the log format, pictures, exports, Find | *The folder is the canvas* · *One app address, versioned* · *The log format* · *Pictures* |
| `docs/architecture/rooms.md` | `LiveStore`, the relay, merging, authorship, undo, presence, labels | *Live logs* · *A label* |
| `docs/architecture/mcp.md` | `Demos/mcp.mjs`, the seat, `canvas_*` tools, the shard's hand | *The MCP hand* · *The shard's hand, and the model seat* · *The canvas's seat* |

## Rules that hold everywhere

These are the invariants a change is most likely to bend. Each is explained in its topic file.

1. **State is a pure function of the log.** Nothing derived is logged; replay, undo and a merge must give the
   same board. A cache is keyed by the log and never stale.
2. **Ink is never replaced or covered.** A clean form, a route or a text stands in front; undo drops the rep.
3. **Every reading is plural, measured and attributed.** No winner-take-all, no assigned confidence, and no
   tier commits: a model's output is held until a person takes it.
4. **Thresholds are ratios of the marks' own size**, and fixed pixels are about the hand (pass the scale).
   Never restate a threshold in prose: cite `core/src/*.ts`.
5. **A model is asked only by a deliberate act**, never on draw, hold or opening a pane, and never blocks drawing.
6. **Keys never leave the device** and never enter a log, a board, an export, a cache or an address a server
   sees. A room's key travels after `#` and in an `Authorization` header.
7. **Another hand's code runs here only after *Play it here***, each new version of it too, and sealed.
8. **A hand labels only its own ink; undo takes back only this hand's own last act.**
9. **One late or hostile input never breaks the board**: refuse it in words at the door, never throw, never log it.
10. **The person's words on the surface** (`scripts/words.test.mjs`): no engine or developer vocabulary.
11. **One definition, one home**: a threshold, a palette, an inventory or a spelling lives in one place.

## Working with the Codebase

### core (the engine, `@dynaink/core` — start here for recognition/engine work)

```bash
cd core
npm install
npm test         # full suite incl. the canonical-loop scenario (keep green)
npm run typecheck
npm run build    # ESM + d.ts → dist/
npm run build:browser  # IIFE bundle; a copy is committed at Demos/dynaink-core.browser.js
npm run build:node     # ESM bundle for Node; a copy is committed at Demos/dynaink-core.node.mjs
cp dist/dynaink-core.browser.js dist/dynaink-core.node.mjs ../Demos/
```

After engine changes, rebuild both bundles and re-copy them to `Demos/`
(`Demos/session-engine.html` runs the browser one; the MCP hand, the relay's
test and the smokes run the Node one) — CI fails if either committed copy
drifts from source. After surface changes, run
`node Demos/build-surface.mjs` and commit `Demos/session-engine.js` with the
fragments — CI checks that too, and the build refuses a name declared at the
top of two fragments. After editing `Demos/session-engine.html`,
`Demos/sw.js` or `Demos/manifest.webmanifest`, run `node scripts/build-app.mjs`
and commit `app/` with them — CI checks that the app is their build and
`VERSION`'s.

`src/session/session.scenario.test.ts` is the executable spec for the
no-modes flow (lasso → check → summon → bless → artifact). Change it knowingly
or not at all. Design rationale: `ARCHITECTURE-v6-SESSION-ENGINE.md`.

### The app, the version and a release (V1-PLAN R7)

```bash
node scripts/build-app.mjs                 # stamp VERSION, make app/ from Demos/ (after editing the page, sw.js or the manifest)
node scripts/build-app.mjs --check         # CI's: app/ and the stamps are the build of VERSION and Demos/
node scripts/release.mjs 0.2.0 --dry-run   # the whole release printed; nothing written
node scripts/release.mjs 0.2.0             # one commit, one annotated tag, dist/release/dynaink-0.2.0.html — never a push
node --test scripts/build-app.test.mjs scripts/release.test.mjs
node e2e/run.mjs app                       # /app/ in a browser: installable, offline, versioned (also --browser webkit)
node e2e/run.mjs prod                      # the site built and served as Pages serves it, the app run under its headers
node scripts/n4.mjs                        # RENAME-PLAN N4's address changes, listed; --apply only once dyna.ink answers
```

Cut a release on `master`, with the suite and the gate green; the script
refuses a dirty tree and a version not greater than the last. The first
release has no previous tag, so its section is the whole history unless
`--since <ref>` says where to start. Then, on John's instruction, what the
script prints: push the branch and the tag to
`https://github.com/jjh111/MetaMedium.git` (the fetch URL; `origin`'s push URL
is deliberately a lock), and
`gh release create v<version> dist/release/dynaink-<version>.html --title "dyna.ink <version>" --notes-from-tag`
(0.1.0, the last MetaMedium, was `metamedium-0.1.0.html`, titled "MetaMedium 0.1.0").
Pages serves the app at `/app/` with the new version in its help pane; a
browser that had the last release takes the new shell at its first visit.

### Standalone HTML demos

Self-contained single files (inline CSS + JS). Edit directly; test with
`python -m http.server 8000`. They are large — read selectively (search for
function names / UI strings) rather than loading whole files.

### Web App Skeleton (React/TypeScript)

```bash
cd "Web App Skeleton"
npm install
npm run dev      # development server
npm test         # vitest (geometry, recognition, spatial — keep green)
npm run lint     # 0 errors required; `any` warnings allowed until core extraction
npm run build    # typecheck + production build
```

Structure: `src/components/` (Canvas, SuggestionPanel, LibraryPanel, …),
`src/core/` (recognition, spatial, matching), `src/llm/` (heuristic + Claude
interpreters), `src/types/`, `src/test/` (synthetic stroke generators for
tests). Recognition changes must keep the vitest suite green — it encodes the
thresholds, which is why no document restates them.

### The checks

```bash
cd core && npm test && npm run typecheck      # the engine
node Demos/build-surface.mjs --check          # the surface is its fragments' build
node scripts/build-app.mjs --check            # app/ is the build of Demos/ and VERSION
node e2e/run.mjs                              # the browser gate (Chromium); name scenarios to run a few
```

`.github/workflows/ci.yml` is the full list of what CI runs. Never use ports 8010 or 8020 in a test: a room of
John's may be there.

## Technical Specifications

**Performance targets:** drawing latency <16ms (60fps); heuristic recognition
<50ms per stroke; LLM tiers asynchronous and non-blocking.

**Data limits:** max 500 points/stroke, 50 strokes/composition, composition
depth 5, library 100 items.

**Artifact sandbox** (*SANDBOX POSTURE* in `Demos/surface/02-artifacts.js`; MVP.md risk #5): two
sandboxes, never both. An html, svg, text or picture frame is `allow-same-origin` and deliberately **not**
`allow-scripts` — same-origin is what lets ink hit-test into the artifact's DOM, granting both is the known
escape, and markup injected there is inert. A `run` or `mermaid` frame is `allow-scripts` without
`allow-same-origin` — an opaque origin that cannot reach the page, its storage or its keys — with a CSP of its
own whose `connect-src` is `'none'` (`frameCSP`): no fetch, socket or beacon. That does not stop the frame
navigating itself, so the page's `<base>` is its address less the fragment (`pinBase`), and no frame's base carries
a room's key, and a frame that loads another page is stopped (`frameHello`, `frameLoaded`; a destination that answers
204 is not caught). A `js` behaviour's worker runs inside an opaque-origin frame
of the same kind under `WORKER_HOST_CSP`, its network, storage and channel globals taken away besides
(`WORKER_HARDEN`). Another hand's `js` or `run` runs only after *Play it here* (*Living artifacts*). On dyna.ink
the app's pages carry `cloudflare/pages/csp.txt` as a header, and as a meta in the built pages.

**Browser support:** Chrome 100+, Safari 15+, Firefox 100+. Touch + mouse.
WebLLM features require WebGPU.

## Design System

> **Source of truth: `brand/tokens.css`.** Every dyna.ink colour, face, size
> and spacing value is defined there and nowhere else; `brand/styleguide.html`
> is the living specimen, and `brand/README.md` has the four laws and how to
> adopt them on a surface. Don't restate a hex here — that is how three
> palettes happened.

The four laws, in short: **paper first** (light is the design — a *warm* ground
under cool sea ink; dark is the same tokens inverted and deliberately the less
colourful of the two, a neutral grey room; no rule below the token layer may
branch on theme); **one face** (IBM Plex Mono carries display, prose, UI and
code); **colour is signal, not decoration** (never an accent bar, and exactly
one categorical scale — `--thread-*`, for the timeline's lineages); **ink is
never covered** (a derived form draws in front with the hand's ink beneath).

**Status: v1 draft, 3 Sept 2026. `index.html` is fully migrated** — tokens,
typeface, figures, diagrams, timeline, hero and footer. The demos have not moved:

| Surface | Carries today | Moves to |
|---|---|---|
| `index.html` (whitepaper v5) | **migrated.** Warm paper · sea ink · teal keyword · IBM Plex Mono throughout · signal colours · `--thread-*` badges · one plate/padding/caption per figure · the hero and footer on the canvas ground · paper/canvas switch in the bar (`?theme=` shares a surface) · the sketchbook gallery as one stage + a thumbnail strip (the lightbox feeds off the same strip) · set grids for rungs/roadmap/scenarios (`.grid-band`, cols 2–3 on desktop, one column on a phone) | — |
| `Demos/`, flagship demos | `#0a0a0f` · `#e8e4d9` · gold `#c9a84c` · Space Grotesk | the canvas ground; the gold retires |
| `lens-canvas/`, `manim-explainer/`, `playground.html` | `#020a12` sea-deep · cyan `#7dd8f7` · gold `#d4af37` · JetBrains Mono | **left alone** — this is johnhanacek.com's language, not dyna.ink's |

Recognition feedback in the unmigrated surfaces (accepted `#0066ff`, pending
`#666666`, green/orange confidence) maps onto `--sig-read`, `--sig-held`,
`--sig-high` and `--sig-mid`. Green becomes teal deliberately: green reads as
*pass*, and a confident reading is still only a reading.

**Figures are a component, not a per-figure decision** (`brand/styleguide.html`
§11). A figure is a plate and a caption sharing one padding behind one hairline;
the caption's first child names the figure. A diagram is drawn in the diagram
rung's own roles — container, node, edge, label, annotation, plus keyword and
machine — so its CSS classes are the only place its colours live. Diagram type
is one scale in viewBox units (title 26, node 20, label 17, micro 14, tiny 12),
which only works because every diagram is authored 1000 units wide.

> 📌 **Pinned, still John's:** whether the wordmark keeps its two-tone split,
> how far the canvas ground travels into `Demos/` before the gold goes, and
> whether the whitepaper's prose moves to IBM Plex Mono — mono at that length
> changes how a published page reads, so it is a decision, not a refactor. The
> whitepaper stays on paper even when it embeds a dark demo — that seam is
> deliberate (see `WHITEPAPER-v5.1-PLAN.md`).

## Development Philosophy

- **Ship something visible weekly** — no infrastructure-only weeks
- **Simple first** — build the simplest thing that works; refactor when patterns emerge
- **One core, many surfaces** — recognition logic belongs in `core`; demos consume builds
- **Progressive enhancement** — heuristics always work offline; LLM tiers enhance, never gate
- **Experiments feed the platform** — they may fork and re-implement to move fast, but a proven idea lands in core with tests, and experiments never become the focus (`EXPERIMENTS.md`)
- **One definition, one home** — a threshold, a palette, or an inventory lives in exactly one place; everything else links to it
- **Keep the reference current** — update the topic file under `docs/` (and this file, when the map or a rule changes) in the same PR as the change

## What to Preserve When Evolving

- Fingerprinting system and geometric utilities (expanded, not replaced)
- The `context` array (kept for compatibility as `components`/`basedOn` grow)
- Published URLs — retire old demos to `archive/` with redirects, never break links (the gate's `app`
  scenario asks every address the whitepaper, `404.html` and the README link into the site)
- The whitepaper's claim-to-demo honesty: only link demos that actually show what the text claims
- A room's key travels in an invite's fragment and an `Authorization` header — never in a log, a board, an
  export, a cache (the `room` scenario looks) or a frame's base (`pinBase`) — and another hand's code, each new
  version of it and a frame of theirs that wires it too, runs here only after *Play it here* (the `security` scenario)

## Common Pitfalls

1. Don't fork the monolithic demos again — converge on the core (ROADMAP.md)
2. Don't let LLM calls block the drawing loop
3. Don't over-engineer ahead of a shippable demo (MoE/embeddings are deferred — see ROADMAP.md)
4. **Don't restate thresholds in prose.** They lived in ten documents and
   drifted; this file's own copy went stale twice. Cite
   `core/src/*.ts` instead. The one intentional mirror is
   `skills/dynaink-code/skill.md`, which Claude Code loads standalone —
   re-verify it against the engine when recognition changes
5. The legacy monoliths (`doodle2-canvas.html`, `metadoodle1.html`,
   `Web App Skeleton/src/core/`) still carry their own diverged recognition
   copies. Read the file you're editing; land new logic in core

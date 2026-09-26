# MetaMedium diagrams — overview first, interaction second

**Implementation handoff for glm5.3flash**  
**Status: proposed implementation plan; not an implemented or verified revision.**

## Brief

John likes the most recent interactive artwork. Preserve its character while recovering the older diagrams’ ability to show relationships and multiple states at a glance. Audit all seven plates for text in the foreground, alignment, spacing and readable hierarchy.

> Desktop explains through what is already visible. Interaction traces that explanation. Mobile can focus on one state without losing access to the whole.

Do not flatten this into a generic card UI or revert wholesale to the old SVGs. Combine the earlier explanatory composition with the newer engraved geometry, semantic colours, source-preserving overlays and readable HTML labels.

## 0. Working state and safety — read before editing

John explicitly requested **an isolated preview** because another session was actively editing the primary checkout.

- Primary checkout, **do not edit**: `/Users/johnhanacek/Documents/github/MetaMedium`
- Isolated development checkout: `/Users/johnhanacek/Documents/github/MetaMedium-diagram-preview`
- Isolated branch: `diagrams-visible-states`
- Base commit: `d1a65e8` (older static diagram audit).
- The isolated checkout contains a copied, uncommitted version of the latest interactive pass, plus an **unfinished generator experiment** from this planning session.
- Do not merge into `master`, push, deploy, or modify the primary checkout. Deliver a verified isolated preview for John to review.
- Do not `git reset --hard`, clean untracked files, or overwrite the checkout wholesale.

### Important incomplete-work warning

`Assets/whitepaper-figures/build.py` contains an initial `snapshot()` helper and new `fp-scenes` / `data-overview` template. **The matching CSS and responsive JS were not implemented. The generated index was not synchronized or tested for this experiment.** Treat this scaffold as disposable implementation material, not a working baseline.

The copied `figures.js` includes the other session’s `enhanceWhitepaperFigures` incremental initialization. Preserve that benefit if retaining synchronous per-plate enhancement. The partial generator’s `aria-controls` references are not all matched by actual panel IDs: repair and test them.

`e2e/node_modules` is a local symlink to the primary checkout’s installed test dependencies. **Do not stage this symlink.** If dependencies need changing, install them in the isolated checkout rather than modifying the shared target.

Before development:

1. Run `git status --short`, `git branch --show-current`, and inspect the four figure-source files plus the current test runner.
2. Compare the newest primary-checkout figure sources read-only. Another session may have finished accessibility fixes since this snapshot. Bring over relevant fixes deliberately, not by blind overwrite.
3. Decide whether to complete the scaffold or reconstruct the template cleanly from the latest coherent interactive pass. Keep the geometry and prose source; do not implement two parallel render systems.

## 1. Source map and precedents

| Source | Purpose |
| --- | --- |
| `brand/README.md`, `brand/tokens.css` | Warm paper / teal / IBM Plex Mono; semantic colour roles |
| `Assets/whitepaper-figures/README.md` | Existing figure authoring workflow and test scope |
| `Assets/whitepaper-figures/build.py` | Canonical authored content and SVG geometry |
| `Assets/whitepaper-figures/figures.css` | Layout, theme roles, labels, responsive rules |
| `Assets/whitepaper-figures/figures.js` | Progressive enhancement, state selection, loop and sharing |
| `index.html` | Static generated blocks between `whitepaper-plate:KEY` markers |
| `e2e/whitepaper-figures.mjs` | Actual-page browser audit; must be updated for simultaneous visibility |
| `e2e/servers.mjs` | Disposable local static server for tests |

Historical comparison: use `git show d1a65e8:index.html` and `git show 82f808a:index.html`. Original representation artwork remains at `Assets/fig-digidraw.svg`.

Optional local reference artifacts (temporary, not required dependencies):
- `/tmp/metamedium-history/inventory.json` and `static-*.png`: older static comparisons.
- `/tmp/metamedium-interactive-before/` and `/tmp/metamedium-interactive-before.html`: captured interactive source before this revision.

What to inherit:
- **Older:** side-by-side modalities and alignment paradigms; paired human action/system response; explicit progression; lens creation and operations.
- **Newer:** stronger geometry; persistent source ink; distinct model overlays; native controls; readable HTML labels; honest conceptual examples rather than fabricated confidence or bandwidth measurements.

## 2. Responsive information architecture

Use these as initial implementation breakpoints; adjust only if rendered evidence shows a real collision or an unnecessarily cramped layout.

| Available viewport | Presentation | Selection behavior |
| --- | --- | --- |
| **900px and above** | Simultaneous comparison columns; two for alignment, three for other comparisons | Highlights a column/role; never hides another primary state or reading |
| **600–899px** | All states in illustrated rows: artwork left, explanation right | Highlights the chosen row; does not collapse the others |
| **Below 600px** | One selected state with readable full-width artwork and explanation | Explicit state buttons plus **Show all states** / **One state at a time** |
| **No JS / print** | Every state and explanation available | No dead controls; no meaning accessible only through a click |

“Show all” means available concurrently in the document, not forcing every paragraph inside one physical screen. Still optimize for information density: avoid enormous repeated introductions, decorative empty space and an illustration towering over a hidden explanation.

The spectrum and triad use a **shared map**, not repeated copies of substantially identical drawings. Show all layers/nodes in that map, with all role summaries visible on desktop/tablet. On phones, focus the explanatory reading while retaining map context; Show all reveals the full set of explanations.

Use the same semantic state content across breakpoints. Resize/orientation changes must preserve the selected state and reveal previously hidden content when entering a wider layout. “Show all” is a phone presentation preference, not a separate data model.

## 3. Plate-by-plate direction

### 01 — Representation spectrum (`spectrum`)

- Preserve the exploded stack: **marks → structure → revisable interpretation**.
- Keep all three layers legible at rest. Selection strengthens one layer; it must not make the others effectively disappear.
- Put matching numbered or explicitly named summaries alongside the corresponding layers. Avoid forcing readers to infer which distant paragraph labels which plane.
- Recover the older tool/representation context as a concise readable continuum or examples row. Tools may span layers; do not imply a measured capability ranking.
- Keep layer labels on clear foreground plates with consistent anchors and enough separation from plane edges.

### 02 — Communication capacity (`capacity`)

- Show **text, voice and drawing together** on wide screens.
- Keep the latest text raster, waveform engraving and spatial topology.
- Align medium headings, artwork bounds, descriptive headings and equivalent fact rows.
- The comparison should immediately read as **sequence / sequence + prosody / spatial relationships**.
- Remove redundant repeated labels if the column heading already explains the picture. No invented bandwidth values or claim that drawing is universally superior.

### 03 — Triadic closure (`triad`)

- Keep one Language–Computation–Meaning triangle, with all node labels above artwork and clear endpoints.
- Show the contribution of all three roles, not just the currently selected one.
- Distinguish the execution path from interpretation/revision through labelled line styles and semantic colour.
- Retain the return-path checkbox as an explanatory demonstration. Label it in terms of showing return paths; do not imply that meaning ceases to exist when a checkbox is off.
- Direct node buttons and ordinary state buttons should select the same reading and preserve keyboard focus.
- Avoid duplicated maps unless a small secondary execution-path inset materially improves understanding.

### 04 — Negotiation (`negotiation`)

- Restore the **visible sequence**: imperfect oval → two dots → “happy” plus a proposed smile.
- On desktop, show all three drawings together, in a clear reading order.
- Pair each person action with the system’s response. This is the older version’s strongest explanatory device; recover it explicitly.
- Keep the same imperfect source contour in every step. Added user ink and the model’s proposed smile must remain distinguishable.
- Put the contextual word and response labels above the drawing. Do not cover them with rings, guides or model paths.
- No invented confidence values. End with a concise shared-vocabulary outcome, clearly marked as the scripted example’s proposal rather than live recognition.

### 05 — Semiotics (`semiotic`)

- Show the ambiguous sign and the alternative **unframed / portrait / orbital** contexts concurrently on desktop.
- Preserve the relationship among sign, referent and interpretant. This is not a confidence ladder and the interpretant is not simply “the AI”.
- Avoid reprinting a dense triangle of long labels at a tiny scale three times. Use readable shared role labels or simplified per-context annotations where appropriate.
- The viewer should see immediately what source form stays invariant and what context changes.

### 06 — Cognitive lenses (`lenses`)

- Compare **physics / chemistry / composed** readings of the same graph without toggling away the alternatives.
- Preserve source ink, role-specific overlays and the composed view’s separate contributions.
- Recover the older architecture’s missing context in a concise visible strip: **repeated notation → named vocabulary/lens → apply / share / compose**. Frame this as the proposed architecture, not implemented training.
- Avoid repeating three long identical operation lists when a shared operations row would communicate the relationship more plainly.
- Retain share-view behavior. The selected state determines the shared URL; serialize light/dark explicitly. Keep the manual-copy fallback and invalidate stale generated links after selection changes.
- State clearly that the URL shares a view, not a trained recognizer. The chemistry illustration is an analogy, not a valid molecule.

### 07 — Alignment (`alignment`)

- Restore the direct side-by-side comparison: **constraints only / constraints + shared ground**.
- Keep the new geometry and show safeguards in both views. Do not reinstate the old false dichotomy of safeguards versus communication.
- Align person/system labels, boundary extents, central process and explanatory rows across the pair.
- The opaque process and inspectable network should be visibly different before any interaction.
- Give the revision path space below the shared network. Its label must remain readable and must not appear in the constraints-only picture.

## 4. Implementation guidance

### Markup and geometry

- Keep `build.py` canonical and static markup in `index.html`. No runtime network/model calls.
- Prefer one semantic article per comparison state, with its illustration and reading together. Use a shared map for spectrum/triad.
- The experimental `snapshot()` approach may be retained: materialize the relevant geometry at build time and remove inactive alternatives. Make every SVG ID, title, description and marker reference unique per plate **and state**.
- Do not regex-scale arbitrary SVG numbers; this can corrupt IDs and arc flags.
- Use per-scene state hooks for conditional labels and paths. A parent figure’s selected state must not change the content of another concurrently visible scene.
- Use real IDs for every `aria-controls` target. Keep SVG accessible names appropriate to the displayed state rather than describing hidden alternatives as though they were shown.

### Layout and foreground text

- Establish explicit local stacking: isolated map wrapper; SVG below; HTML labels above; interactive labels above decorative layers. Decorative geometry must not capture pointer events.
- Align repeated content with shared grid rows/subgrid where practical: headings, artwork, explanatory headings and equivalent facts. Do not hand-pad columns with arbitrary blank spacers.
- Avoid a fixed-height text box that clips at narrow widths, larger text settings or font-loading changes.
- Keep meaningful text in HTML rather than shrinking desktop SVG labels into phone-size type.
- Use page/brand tokens in both themes; do not substitute John’s personal-site navy/gold palette.
- Compare resting, selected and hovered states. Nonselected text must retain full readable contrast; selection is not permission to fade everything else away.

### Enhancement

- Compute narrow/wide visibility explicitly and re-evaluate on breakpoint changes, without clearing the current choice.
- Desktop/tablet: all main readings and scenes visible. Selection only changes emphasis and announcements.
- Phone focus: selected scene/reading visible. Show all restores all; selecting an item while in overview must have predictable behavior and must not unexpectedly jump the page.
- Preserve native click/keyboard semantics, 44 CSS-pixel targets, visible focus, reduced-motion support, and uninterrupted touch scrolling. Do not replace simple button clicks with `pointerdown + preventDefault`.
- Keep incremental/idempotent enhancement if using it, and avoid collapsing a tall fallback after first paint. Do not introduce perpetual animation.

## 5. Development sequence

1. **Reconcile baseline in isolation.** Resolve the unfinished template, retain relevant concurrent accessibility improvements, and confirm source/markup coherence.
2. **Build alignment first.** It is the simplest two-state proof of simultaneous desktop comparison and focused phone behavior. Verify before generalizing.
3. **Generalize to capacity and negotiation.** Confirm aligned three-column content and visible cause/effect; then adapt semiotics and lenses without flattening their distinctive structure.
4. **Refine spectrum and triad as shared-map exceptions.** All roles remain visible; summaries follow their relationships rather than copying the comparison-column solution.
5. **Audit every plate visually.** Fix layering, collision, text wrapping, arrow termination, source visibility and unnecessary whitespace.
6. **Run the complete responsive/accessibility suite.** Do not stop at a screenshot or desktop smoke pass.
7. **Deliver isolated preview and evidence.** Update the local README to explain actual behavior. No merge or publishing without John’s review.

Generate and synchronize with targeted replacements:

```sh
python3 Assets/whitepaper-figures/build.py --emit /tmp/metamedium-visible-state-plates
# Targeted-patch each marked block in index.html from its emitted fragment.
python3 Assets/whitepaper-figures/build.py --check
node e2e/whitepaper-figures.mjs --smoke
node e2e/whitepaper-figures.mjs
git diff --check
```

Run from the **isolated checkout**. Use a separate evidence directory, e.g. `FP_RESULTS=/tmp/metamedium-visible-state-audit`, so these results cannot be confused with an earlier pass.

## 6. Acceptance tests — definition of done

### Coverage

- Enumerate all seven plates and every authored selectable state from the manifest. The current content has 20 readings; derive the expected count from source if content structure changes.
- Chromium **and** WebKit; light **and** dark themes.
- At least 1440, 1024, 900, 899, 768, 600, 599, 390 and 320px widths, plus landscape phone (844×390).
- Test crossing the breakpoints on an already-loaded page, not only fresh contexts.

### Behavioral requirements

- At desktop/tablet widths, the visible scene/reading count equals that plate’s total **before any click** and after every selection.
- On phones, focused content is one state; Show all exposes every state; returning to focus preserves the chosen one.
- Wider resize restores all states, even if the phone previously hid them.
- Desktop selection must not swap out another column’s picture, change its label, or hide it.
- Triad node activation, checkbox semantics, keyboard Enter/Space, touch scrolling and lens sharing continue to work.
- No-JS and print show complete comparisons, including their illustrations—not just all text beside one arbitrarily selected image.
- No new console errors, duplicate IDs, missing marker references, missing `aria-controls` targets or dead controls.

### Visual requirements

- Text labels are visibly in front of artwork in **every state**, with no accidental occlusion.
- No label-label collision, clipped text, label crossing outside its local map, horizontal page overflow, or undersized touch target.
- Corresponding column headings, artwork areas and fact rows align; collect DOM rectangles to substantiate this.
- Body/label text meets the established 4.5:1 contrast check in both themes, including selected and unselected backgrounds.
- Preserve sensible foreground/background relationships under forced colours.
- Compare the **real page** rather than an extracted mock stylesheet. The actual dark-theme hook is `:root[data-theme="dark"]`.
- Inspect actual screenshots for all seven plates at desktop, tablet and phone sizes in both themes. DOM assertions alone do not establish a good composition.

Update the existing tests: the old unconditional `visibleReadings === 1` assertion is now wrong on wide screens. Test **all SVGs** and all local labels, not just `figure.querySelector('svg')`. Keep results machine-readable; report exact executed counts and failures. Browser/device emulation is not physical iPad testing.

## 7. Delivery back to John

Provide:
1. A working isolated preview URL whose response has been checked against the revised files.
2. A short account of what was preserved from the old and new versions.
3. Desktop and phone examples, with the full screenshot/report location available.
4. Test totals, any remaining limitations, and the exact isolated branch/commit if committed.
5. An explicit statement that the revision is **not merged or deployed**.

Do not claim success from the partial scaffold, a stale test report, or a single diagram passing. If blocked, report the real blocker without fabricating visual or test results.

# Whitepaper graphic plates

Seven authored diagrams in `index.html`, rebuilt as editorial graphics with
progressive enhancement. Archival screenshots and the conceptual-blending GIF
are intentionally unchanged. The former `fig-digidraw.svg` remains in Assets as
an original artwork, but its whitepaper position now uses the spectrum plate.

| Anchor | Reading interaction |
| --- | --- |
| `#figure-spectrum` | Emphasize preserved marks, structure or interpretation |
| `#figure-capacity` | Compare sequence, prosody and spatial relations |
| `#figure-triad` | Inspect Language / Computation / Meaning; expose return paths |
| `#figure-negotiation` | Step from oval to dots to a contextual word |
| `#figure-semiotic` | Compare an unframed sign, portrait context and orbital context |
| `#figure-lenses` | Apply physics / chemistry, compose both, share a view link |
| `#figure-alignment` | Reveal shared ground while keeping safeguards present |

## Source and rendering

- `build.py`: authored content and deterministic vector geometry. No runtime
  generation, model output, numerical confidence claims or vendor benchmarks.
- `figures.css`: layout and graphic roles, using the page's existing brand tokens.
  No independent palette and no new font. Dark mode is `:root[data-theme="dark"]`.
- `figures.js`: small, dependency-free enhancement; no API calls, continuous
  animation, external sharing service, model inference or document mutation
  beyond the selected illustration state.
- `index.html`: committed static markup between the `whitepaper-plate:KEY`
  comment pairs. All content is readable without JavaScript; controls appear
  only after successful initialization. Printing reveals every reading.

### Editing

1. Edit the content/geometry in `build.py`.
2. Run `python3 Assets/whitepaper-figures/build.py --emit /tmp/metamedium-plates`.
3. Replace each affected marked block in `index.html` with its emitted fragment
   using a targeted patch. Do not overwrite unrelated edits to the whitepaper.
4. Run `python3 Assets/whitepaper-figures/build.py --check` to verify exact sync.
5. Run `node e2e/whitepaper-figures.mjs` from the repo root.

CSS and JS do not require a build. Use unique `fp-KEY-*` SVG IDs; arrowhead colour
must match the relation's role. Preserve the original mark when changing a
reading. Retain semantic context: these are conceptual illustrations, not live
recognition or calibrated measurements.

## Small screens and accessibility

Geometry stays on a 1000-unit SVG canvas. Text and controls use HTML at reading
size rather than inheriting the SVG's scale. Below 850px the graphic and reading
stack; below 560px the facts reflow into a single column. Buttons have at least
44 CSS-pixel hit targets; native click/keyboard semantics preserve scrolling.
The triad also provides direct node-label controls. All state changes have a
polite announcement. No information requires hover, dragging, animation or colour
alone. There is no zoom lock. Reduced motion removes transitions entirely.

Lens sharing copies a URL where permitted. On plain-HTTP tailnet previews or
clipboard denial, a selected readonly URL remains available for manual copying.
The link contains only the chosen lens and theme, not a recognizer or user data.
Changing the lens hides a previously generated share link to avoid stale state.

## Verification

The dedicated runner starts an isolated localhost server and loads the **actual
whitepaper**, including its theme toggle. It does not extract CSS or use a fake
`.theme-dark` wrapper. It tests Chromium and WebKit at desktop, landscape tablet,
portrait tablet, standard phone, narrow phone and landscape phone widths, in both
themes. These are browser-engine/device emulations, not a physical iPad test.

Checks cover all 20 selectable readings, rendered text bounds, overlapping
labels, 44px targets, text contrast (4.5:1 minimum, with alpha-composited HTML
backgrounds), SVG marker references, keyboard/touch activation, direct triad
controls, loop toggling, share-link restoration, runtime errors, normal/reduced
motion, print and no-JS fallbacks. Chromium also exercises a touch scroll gesture.
External YouTube/analytics requests are excluded; this is not the engine demo's
release gate. The normal-motion and no-JS checks load the real page too.

Evidence is written to `/tmp/metamedium-figure-audit` (override with `FP_RESULTS`).
Screenshots hide only the sticky navigation so it does not obscure the cropped
figure; they otherwise use the page's real styles and fonts. Every run saves a
machine-readable `results.json`. `--smoke` runs desktop Chromium in both themes.

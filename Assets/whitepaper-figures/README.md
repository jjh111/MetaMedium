# Whitepaper graphic plates

Seven authored diagrams in `index.html`, rebuilt as editorial graphics with
progressive enhancement. Archival screenshots and the conceptual-blending GIF
are intentionally unchanged. The former `fig-digidraw.svg` remains in Assets as
an original artwork, but its whitepaper position now uses the spectrum plate.

## What each plate offers, and where

Two kinds of plate, and one rule: **a control is offered only where it does
something.** Nothing is ever dimmed or hidden to make a selection legible, and
no plate carries divider rules — they group by space alone.

**Overview plates** hold one shared map beside every reading. Selecting a
reading traces its role in that map, at every width, and from 851px the map
stays beside the readings while they scroll — which is what makes the tracing
worth doing on a long plate.

| Anchor | Reading interaction |
| --- | --- |
| `#figure-spectrum` | Trace preserved marks, structure or interpretation in the layered map |
| `#figure-triad` | Trace Language / Computation / Meaning; switch shared meaning off to isolate a command path |

**Comparison plates** put every scene side by side from 561px up, so there is
nothing left to choose: the whole toolbar is the phone's, where it picks which
scene is on screen. A lens link (`?lens=`) is still honoured at every width.

| Anchor | Scenes compared |
| --- | --- |
| `#figure-capacity` | Sequence, prosody and spatial relations |
| `#figure-negotiation` | An oval, dots, and a contextual word |
| `#figure-semiotic` | An unframed sign, portrait context, orbital context |
| `#figure-lenses` | Physics, chemistry, both composed — and sharing one of them (phone) |
| `#figure-alignment` | Constraints alone, and constraints plus shared ground |

## Ink rules

Tufte's test, applied to these plates: a stroke has to carry meaning, and what
differs between scenes has to be the loudest thing on the page.

- **No furniture.** No graph paper, no registration marks, no hatching, no
  edition tag. Nothing in any plate is measured against a grid, so there is no
  grid to measure against.
- **One outline per thing.** A plane, a triangle, a boundary or a node is drawn
  once. The plates used to stack five, seven or thirteen offset copies of a
  contour to make a texture, and that texture was louder than the data inside
  it. Where an outline and a relation said the same thing twice — the triad's
  backdrop triangle behind its own edges — the relation stays and the outline
  goes.
- **Weight says what differs.** The substrate every scene shares is a hairline
  in ink-soft; the overlay that makes a scene itself is drawn heavier
  (`.fp-snapshot-layer`) and in its own colour.
- **Label where the thing is.** An overlay is named beside the overlay —
  `labels` may be a dict keyed by scene, `{'all': …, '<state>': …}` — not in a
  legend the eye has to carry back to the picture. A legend stays only where it
  defines a colour language the drawing cannot say for itself; `legend=''`
  emits no legend row.
- **Number only what is ordered.** `ordered=True` numbers the scenes of a
  spectrum, a sequence of turns, or a cumulative pair. Three media, three
  contexts and two vocabularies have no order, so they carry no numbers.
- **Fill the canvas.** `fit=(scale, cx, cy)` scales a plate's artwork about its
  own content centre onto the same 1000-unit canvas, so taking furniture away
  never leaves the subject small in the middle of its box. The canvas stays
  1000 units wide — the audit asserts it — and strokes scale with the drawing
  as a zoom would.

## Source and rendering

- `build.py`: authored content and deterministic vector geometry. No runtime
  generation, model output, numerical confidence claims or vendor benchmarks.
- `figures.css`: layout and graphic roles, using the page's existing brand tokens.
  No independent palette and no new font. Dark mode is `:root[data-theme="dark"]`.
  It also decides which controls are offered at which width, and holds the one
  `overflow: clip` that lets an overview map stick inside a clipped `figure`.
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
stack (and the map stops sticking); below 561px the facts reflow into a single
column, a comparison plate stacks its scenes and offers the choices that pick
between them, and "Show all states" reveals every one. Buttons have at least
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

Checks cover every selectable reading where the controls are offered (20 on a
phone) and the resting state where they are not (11 from 561px up, with the
toolbar asserted gone rather than merely empty), rendered text bounds, overlapping
labels, 44px targets, text contrast (4.5:1 minimum, with alpha-composited HTML
backgrounds), SVG marker references, keyboard/touch activation, direct triad
controls, loop toggling, share-link restoration, runtime errors, normal/reduced
motion, print and no-JS fallbacks. Chromium also exercises a touch scroll gesture.
External YouTube/analytics requests are excluded; this is not the engine demo's
release gate. The normal-motion and no-JS checks load the real page too.

`node e2e/whitepaper-figure-ink.mjs [width …]` is the companion diagnostic, run
by hand after editing geometry or moving a label. The plate audit cannot see a
label sitting on a drawing — a label carries the plate's own background, so it
simply hides what it covers — and this samples every geometry element along its
own outline to find exactly that, plus geometry drawn outside the canvas and
labels pushed outside their drawing. Desktop and tablet widths are held to zero
findings; phone widths are reported, not enforced, because a 1000-unit drawing
in a ~300px box with readable labels is crowded by construction. A label may
interrupt the line it *names* — the two that do are named in its `ALLOWED`.

Evidence is written to `/tmp/metamedium-figure-audit` (override with `FP_RESULTS`).
Screenshots hide only the sticky navigation so it does not obscure the cropped
figure; they otherwise use the page's real styles and fonts. Every run saves a
machine-readable `results.json`. `--smoke` runs desktop Chromium in both themes.

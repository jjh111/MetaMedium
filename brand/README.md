# MetaMedium — the visual system

**One definition, one home.** `tokens.css` is the only place a MetaMedium
colour, face, size or spacing value is defined. `styleguide.html` consumes it
and adds nothing but layout — open it in a browser to see the whole system,
and use the switch at the bottom right to put it on the dark canvas ground.

| File | What it is |
|---|---|
| `tokens.css` | **The system.** Light tokens on `:root`, dark tokens on `:root[data-theme="dark"]`. Link it, or inline it verbatim into a single-file surface |
| `styleguide.html` | The living specimen: foundations, palette, type, the mark, ink states, readings, UI, both grounds, an editorial page, voice, figures &amp; diagrams, long-form furniture (callout, pull quote, embed, gallery, **the timeline**) |

Status: **v1 draft, 3 Sept 2026.** The whitepaper's **figures and diagrams**
are migrated; the page around them is not — see *Convergence* below. Two decisions are still John's: whether the wordmark keeps
its two-tone split, and how far the canvas ground travels into `Demos/` before
the gold is retired.

## The four laws

1. **Paper first, and the paper is warm.** The light surface *is* the design:
   a warm ground (`#f8f5ef`, the whitepaper's own tone) under cool sea ink,
   because the contrast between a warm page and a cool mark is what makes ink
   look like ink. Dark is the same design inverted for a canvas you stare at
   for an hour, and it is deliberately the **less** colourful of the two — a
   neutral grey room with every claim colour pulled back, so saturation belongs
   to the user's own marks. Dark mode changes tokens only: **no rule below the
   token layer may branch on theme.**
2. **One face carries everything.** IBM Plex Mono sets display, prose, UI and
   code. A project whose claim is that *a drawing is code* cannot change voice
   between the drawing and the code. Register is made with size, weight,
   spacing and rules — never a second typeface.
3. **Colour is signal, not decoration.** Teal is the keyword. Blue means read
   and accepted, grey means held and unblessed, amber and red are confidence
   and damage, purple means a model contributed it. **No colour is ever applied
   as an accent bar.** There is exactly one *categorical* scale — `--thread-*`,
   four pigments for the timeline's lineages — and it is used nowhere else.
4. **Ink is never destroyed, so ink is never covered.** A derived form draws in
   front at full strength with the hand's ink faint beneath it. Anything the
   system inferred must be visibly reversible.

## Adopting it on a surface

```html
<link rel="stylesheet" href="../brand/tokens.css">
```

For a single-file demo, paste the contents of `tokens.css` at the top of the
surface's `<style>` block — including the `@import` for IBM Plex Mono, which
must stay the first rule — and delete whatever palette it was carrying. Then:

- Use the token, never the hex. A literal `#0b6f7d` in a surface is drift with
  a head start.
- If a component only looks right on one ground, **the token set is wrong** —
  fix the token, not the component.
- The signal tokens (`--sig-*`, `--stroke-*`) are load-bearing. A surface that
  borrows one for decoration is lying about what the engine knows.

## Convergence

Three palettes are in the repo today, and two of them were borrowed before the
project had one of its own. In migration order:

| Surface | Carries now | Move to |
|---|---|---|
| `index.html` — **figures and diagrams** | **done.** One plate, one padding, one caption structure; six diagrams on the diagram roles, IBM Plex Mono labels, one type scale | — |
| `index.html` — the page around them | red `#e63946`, DM Sans + Space Grotesk, sketch blue/green/purple, five saturated timeline badges | teal keyword; sketch colours become `--sig-*`; badges become `--thread-*`. *The warm paper stays — the system adopted it* |
| `Demos/session-engine.html` | `#0a0a0f`, gold `#c9a84c`, Space Grotesk | the canvas ground; gold retires |
| `Demos/` others, `doodle2-canvas.html`, `metadoodle1.html` | as above | canvas ground, last |
| `lens-canvas/`, `playground.html`, `manim-explainer/` | the personal-site language (sea-deep, cyan, gold, JetBrains Mono) | **left alone** — these are johnhanacek.com's language, not MetaMedium's |

The recognition-feedback colours the old surfaces hardcode (accepted `#0066ff`,
pending `#666`, green/orange confidence) map onto `--sig-read`, `--sig-held`,
`--sig-high` and `--sig-mid`. Green becomes teal on purpose: green reads as
*pass*, and a confident reading is still only a reading.


## What the whitepaper taught the system

Applying this to `index.html` found four gaps the guide did not cover. All four
are now in it (§11 Figures &amp; diagrams, §12 Long-form furniture):

- **A figure is one component with one padding.** The old figures padded the
  drawing `0.75rem` inside a tinted gradient and the caption `1rem/1.5rem`
  against a border it did not share — which is exactly why the captions read as
  bolted on. Plate and caption now share `--fig-pad` and one hairline.
- **The label and description were not captions.** They were `div`s *inside*
  the plate, so nothing but a sighted reader knew they described the figure.
  They are now a real `<figcaption>` whose first child is the figure's name.
- **A diagram needs a unit.** Six diagrams authored at 400, 700, 750 and 800
  viewBox units picked font sizes independently, so the same role rendered
  anywhere from 14px to 30px across the document. Every diagram is now authored
  1000 units wide — **one unit is one pixel at `--fig-wide`** — and one drawn at
  another width sets `--u` to *width ÷ 1000*.
- **A diagram is drawn in the engine's own roles.** The figures were authored
  for a dark board (light blues, navy fills, a `fill="7b8a9a"` typo rendering
  black) and then dropped onto light paper. Rather than pick colours per figure,
  a diagram now uses `container / node / edge / label / annotation` plus the two
  claims a figure can make — the same vocabulary `metamedium-core/src/diagram`
  reads. The CSS is the only place those colours live, so a diagram inherited
  from an older palette is re-pointed by adding classes.

Figures also gained a rule the canvas has no need for: **a drawing sits on the
plate's padding, a scan bleeds to its edge.** A photograph brought its own
margins; padding one makes a frame inside a frame.

### Not done, and deliberately so

The whitepaper's **prose, nav, callouts, principles, timeline, scenarios and
footer still carry the old warm-paper palette and DM Sans.** The figure tokens
were added under new names (`--mm-*`, `--fig-*`, `--dia-*`) precisely so the
page could keep its own look until that migration is a decision rather than a
side effect — mono at whitepaper length changes the reading experience of a
published page, and that is John's call, not a refactor.

One pre-existing bug found while testing and left alone: **the nav overflows by
about 18px at 375px wide.** It is untouched by this work (the CSS is byte-identical
to `HEAD`), and it is not a figure problem.


## The timeline

The richest component in the system, taken from the whitepaper rather than
replaced by it. Six parts per entry, all load-bearing:

| Part | Why it is there |
|---|---|
| `.tl-year` | Tabular figures, right-aligned, so the column reads as a spine |
| `.tl-pipe` | The connector is a **character** (`┃`), not a border — it lands on the mono grid and survives being copied as plain text |
| `.tl-title` + `.tl-badge` | What it was, and which lineage it belongs to |
| `.tl-author` | Who made it, in full ink |
| `.tl-desc` | What it said, usually in its own words |
| `.tl-sig` | The `┗━━` line: why this entry is in *this* list at all |

Earlier entries collapse behind `.tl-toggle`. The convergence entry
(`.tl-entry.tl-conv`) is the one place the timeline stops listing and makes a
claim, so it is the only entry that takes a container and a synthesis list.

The badges use `--thread-vision / --thread-recog / --thread-intel /
--thread-conv`. The whitepaper ran five saturated pills — blue, purple, green
and two ambers — which put more colour in the lineage list than in the whole
recognition engine. Four, drawn from the system's own pigments, carry the same
information.

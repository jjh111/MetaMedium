# MetaMedium — the visual system

**One definition, one home.** `tokens.css` is the only place a MetaMedium
colour, face, size or spacing value is defined. `styleguide.html` consumes it
and adds nothing but layout — open it in a browser to see the whole system,
and use the switch at the bottom right to put it on the dark canvas ground.

| File | What it is |
|---|---|
| `tokens.css` | **The system.** Light tokens on `:root`, dark tokens on `:root[data-theme="dark"]`. Link it, or inline it verbatim into a single-file surface |
| `styleguide.html` | The living specimen: foundations, palette, type, the mark, ink states, readings, UI, both grounds, an editorial page, voice |

Status: **v1 draft, 3 Sept 2026.** Nothing has been migrated onto it yet — see
*Convergence* below. Two decisions are still John's: whether the wordmark keeps
its two-tone split, and how far the canvas ground travels into `Demos/` before
the gold is retired.

## The four laws

1. **Paper first.** The light surface *is* the design; dark is the same design
   inverted for a canvas you stare at for an hour. Dark mode changes tokens
   only — **no rule below the token layer may branch on theme.**
2. **One face carries everything.** IBM Plex Mono sets display, prose, UI and
   code. A project whose claim is that *a drawing is code* cannot change voice
   between the drawing and the code. Register is made with size, weight,
   spacing and rules — never a second typeface.
3. **Colour is signal, not decoration.** Teal is the keyword. Blue means read
   and accepted, grey means held and unblessed, amber and red are confidence
   and damage, purple means a model contributed it. **No colour is ever applied
   as an accent bar.**
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
| `index.html` (whitepaper v5) | warm paper `#f8f6f1`, red `#e63946`, DM Sans + Space Grotesk, sketch blue/green/purple | the paper ground; the sketch colours become `--sig-*` |
| `Demos/session-engine.html` | `#0a0a0f`, gold `#c9a84c`, Space Grotesk | the canvas ground; gold retires |
| `Demos/` others, `doodle2-canvas.html`, `metadoodle1.html` | as above | canvas ground, last |
| `lens-canvas/`, `playground.html`, `manim-explainer/` | the personal-site language (sea-deep, cyan, gold, JetBrains Mono) | **left alone** — these are johnhanacek.com's language, not MetaMedium's |

The recognition-feedback colours the old surfaces hardcode (accepted `#0066ff`,
pending `#666`, green/orange confidence) map onto `--sig-read`, `--sig-held`,
`--sig-high` and `--sig-mid`. Green becomes teal on purpose: green reads as
*pass*, and a confident reading is still only a reading.

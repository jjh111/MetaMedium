# Sprint plan — the 80% now

**Date:** 10 September 2026 · **Status:** ready to run
**Companion:** `WHITEPAPER-REFRESH-PLAN.md` (§4 reorder, §6 audit, §7 prose)

**Goal.** The engine replay is in the first two screens, the fish is no longer
the first thing a reader can play, the page stops restating itself, and the
README names the right demo. No new assets, no engine work, no figure or
diagram refactors. One afternoon, one or two commits.

**The journey after the sprint:** hero (draw) → overview (three paragraphs) →
**the loop, running (~5%)** → problem → vision → thesis → framework →
development (MVP replay + live surface) → scenarios → future → conclusion
(once).

**Not in this sprint** (the remaining 20%, separate threads): diagram and
figure refactors (including the triadic toggle and the timeline); the
fish-on-surface implementation and its recording (Thread B); `Demos/` triage
and archiving (Thread C); the full prose pass (findings paragraphs, byline),
version bump, v5 archive; the optional "what the engine reads" strip.

Measured baseline (1440 px, from the refresh plan): first engine replay at
**39%** depth, fish at **42%**, live surface at **72%**, page 32,350 px.

> **Progress, 10 Sep 2026 — landed.** Loop embed at **6%** depth (was 39%);
> fish canvas deleted with its CSS, markup and script (~490 lines); page
> **31,132 px** (was 32,350); conclusion **219 → 91 words** (aim was ≤80 —
> John's closing line was kept over the target); hero crumb and Overview
> pointer in; README reordered. The nav's "Loop" item was cut: it tipped the
> nav into wrapping at 960 px, and the rule was to skip at the first sign of
> crowding. The acceptance runs: 4 inline scripts parse, zero fish refs, the
> three remaining embeds are the loop, the MVP page and the live surface.

---

## S1 · Move the loop up — the single biggest win

Cut from Thesis (h3 "The Loop, Recorded", its paragraph, and the
`.demo-container` — canonical-loop iframe) and insert as a new section
**"The Loop, Running"** immediately after Overview.

- The existing paragraph already does the framing (*"What you step through
  below is not a video: it is the engine replaying its own log in your
  browser…"*) — keep it, add one closing sentence: the live surface is in
  Current Development.
- Keep the existing `.demo-header` "Open it →" link.
- `<section id="loop">` so the hero crumb (S4) can reach it.

**Acceptance:** the first `.demo-container` iframe sits at ≤10% page depth
(re-run the depth measurement used for the baseline); Thesis contains no
embed; `#thesis` anchor still works.

## S2 · Fish out

Delete the "Try It" block and everything that exists only for it:

- markup: h3 "Try It: Draw, Name, Interact", its paragraph, the
  `.demo-wrapper` block (prompt, canvas, labels, controls, status) — ~20 lines;
- CSS: `.demo-wrapper`, `.demo-prompt`, `.demo-canvas-container`,
  `#demoCanvas`, `.demo-labels`, `.demo-label(.fish/.food)`, `.demo-controls`,
  `.demo-reset-btn`, `.demo-status` — ~110 lines, plus its two media-query
  mentions (mobile width, print hide);
- script: the whole "Demo Canvas - Interactive Fish Animation" block —
  ~350 lines.

Replace the slot with one short paragraph (no canvas, no iframe): every
interactive in the paper is a recording from the same engine; the live surface
is in Current Development, with a direct link.

**Acceptance:** `rg 'demoCanvas|demo-wrapper|demo-prompt|demoState|fishLabel'`
returns nothing in `index.html`; the only canvas on the page is `#heroCanvas`;
~450 lines removed; page height measured ~1,000 px shorter.

*If John wants the fish visible until Thread B lands:* keep the markup
untouched this sprint and only relabel it "from the 2025 prototype" — but the
recommendation is removal; the hole is one paragraph deep.

## S3 · Say it once (sprint-scoped)

- **Conclusion** to one paragraph, ending on the existing last line.
- **Overview** gains a closing pointer down to the loop.
- **Optional, if time:** each principle card's `.principle-now` line appends a
  "→ Current Development" link; keep the words, remove the implication that
  the status is owned in two places.

**Acceptance:** conclusion ≤80 words; overview references `#loop`; no status
claim lives in two sections.

## S4 · The way in from the hero

- One link under the hero subtitle: **"see the loop ↓"** → `#loop`, styled in
  the hero's existing teal-soft.
- Optional: add "Loop" to the nav after Overview if it fits at 1100 px
  (10 items; skip at the first sign of crowding).

**Acceptance:** from the hero, one click lands on the loop; nav wraps nowhere.

## S5 · README tells the truth (10 minutes)

- Reorder the demo table: `session-engine.html` **first**, described as the
  reference surface — the demo.
- Relabel `doodle2-canvas.html` and `metadoodle1.html` as "earlier prototypes
  (2025)" — links unchanged, no URL breaks.

**Acceptance:** README's first demo row is session-engine.

## S6 · Measure and record

Re-run the depth measurement and put the numbers in the commit message:
loop depth (target ≤10%), page height, conclusion word count, fish lines
removed.

---

## Where the 80% comes from

Three things a reader notices, and this sprint fixes all three:

1. **What happens in the first two screens** — the working loop replaces
   2,500 words of throat-clearing (S1, S4).
2. **Whether the interactive is the product** — a fish from the 2025 prototype
   stops representing MetaMedium (S2).
3. **Whether the page repeats itself** — the conclusion says it once, status
   has one home (S3).

The remaining 20% is craft (figures, diagrams), the fish thread's real
implementation, the demo triage, and the prose register — all deferred, none
blocking.

## Cut lines

If only two hours exist: **S1 + S2 are the 60%** and can ship alone. S3–S5 are
polish; S6 is bookkeeping. Every step is independently shippable and touches
`index.html` exactly once — except S5, which touches only `README.md`.

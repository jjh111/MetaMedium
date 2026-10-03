# dyna.ink — the soft-launch film

A 160-second motion-graphics teaser for a semi-technical audience, in four acts on one infinite canvas, in the
brand's own tokens (`brand/tokens.css`: warm paper, sea ink, teal keyword, IBM Plex Mono; the hand's writing in Caveat).
It shows rather than tells, and the story is the whitepaper's: why a drawing should mean something to the computer.

**The rhythm is punch, then pause.** Every shot is a pose the camera cuts to in 0.65 s (a quintic ease) and then holds
**still**: text moved by a fraction of a pixel a frame shimmers (measured — the browser snaps glyphs, even at 2×), so a
pause never drifts, slides land on whole pixels, and what moves through a pause is a shape. The demo's scenes keep the
clock they were written on; `WARP` maps the film's clock onto it so actions run at their speed or quicker and pauses hold.

**Act I — where it comes from** (0–59 s): a timeline the camera travels along, from the whitepaper's lineage.

| t (s) | Beat | What is shown |
|---|---|---|
| 0 | 1945 | Bush, *As We May Think*: pages, and a trail drawn between them |
| 5.6 | 1963 | Sketchpad: a truss drawn by light pen, its constraints satisfied |
| 11.8 | 1977 | Kay & Goldberg: a Dynabook sketched, every medium inside it — *metamedium* |
| 17.6 | 1980 | Put-That-There: “put that… there.” and the box moves where the speech points |
| 23.2 | 1996 | Landay's SILK: a scribbled window, button and slider recognised; the button presses, the slider slides |
| 29.2 | 2015 | Perlin's Chalktalk: a pendulum sketched, recognised, and swinging |
| 35.6 | 2016 | *As We May Sketch*: a hand curve fitted to a function, and the thesis's line on a truly metamedium |
| 42.0 | today | most tools imitate paper: a toolbar scratched out three times and erased; the flowchart's arrows start to flow |
| 50.0 | 2026 | AI as a meta-word: language → computation, then meaning put back in the loop |
| 55.8 | title | dyna.ink — beyond chat |

**Act II — the read, and inside** (59–86 s): 01 read (a circle read and drawn clean, a pentagon held open); **how it
reads** — two boxes and an arrow climb the rungs INK → SHAPE (with the fingerprint: corners, closure, how much of its
box it fills) → ROLE → CODE, no model asked; **how it answers** — tier 0 the shape rung, tier 1 the instant library,
tier 2 a model that is asked, proposes, and is kept by you; a model gets the drawing's structure, never a screenshot.

**Act III — the demo** (86–152 s): 02 name, 03 diagram (Mermaid, tidy), 04 run, 05 kinds (colour follows meaning),
06 arrange (orbit), 07 together (Claude's hand; the desk and the pad). Beats 04–07 are **v1 as specced** (V1-SPEC §5–§6),
not yet built — a teaser's promise, drawn as the spec says it will look.

**Act IV** (152–160 s): *dyna.ink* written by hand, then drawn clean in front; *the diagrammatic notebook that runs*; the address.

## Use

```bash
open launch-video/index.html                    # scrub it: the bar under the stage, space to play
node launch-video/render.mjs                    # → launch-video/out/dynaink-soft-launch.mp4 (about 6 min)
node launch-video/check.mjs                     # the layout check: text clipped, spilling out of its box, covered, overlapping
node launch-video/render.mjs --stills 3,35,77   # → out/still-<t>.png
node launch-video/render.mjs --from 40 --to 50 --out clip.mp4
node launch-video/render.mjs --url dyna.ink     # the end card's address (default: the live app's)
```

Every frame is `render(t)`, a pure function of time, so a render is deterministic. It needs Playwright
(the e2e's or a global install) and ffmpeg. There is no sound: a score or a voice-over goes on in an editor.

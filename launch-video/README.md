# dyna.ink — the soft-launch film

A 170-second motion-graphics teaser, with synthesised sound, for a semi-technical audience, in four acts on one infinite canvas, in the
brand's own tokens (`brand/tokens.css`: warm paper, sea ink, teal keyword, IBM Plex Mono; the hand's writing in Caveat).
It shows rather than tells, and the story is the whitepaper's: why a drawing should mean something to the computer.

**The rhythm is punch, then pause.** Every shot is a pose the camera cuts to in 0.65 s (a quintic ease) and then holds
**still**: text moved by a fraction of a pixel a frame shimmers (measured — the browser snaps glyphs, even at 2×), so a
pause never drifts, slides land on whole pixels, and what moves through a pause is a shape. The demo's scenes keep the
clock they were written on; `DEMO_STEPS` maps the film's clock onto it — each step a stretch of film and the moment it
reaches, a pause where the moment stays, a cut where the stretch is nothing — so actions run at their speed and pauses hold.

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

**Act II — the read, and inside** (59–90 s): 01 read — a circle read and drawn clean; a pentagon *measured* (its corners
found, its sides compared, each angle said) and named a regular pentagon for what the numbers say, then drawn clean; a
scribble that reads as nothing above the floor, its weak readings held and the ink kept as ink; **how it
reads** — two boxes and an arrow climb the rungs INK → SHAPE (with the fingerprint: corners, closure, how much of its
box it fills) → ROLE → CODE, no model asked; **how it answers** — tier 0 the shape rung, tier 1 the instant library,
tier 2 a model that is asked, proposes, and is kept by you; a model gets the drawing's structure, never a screenshot.

**Act III — the demo** (90–161 s): 02 name — a molecule drawn and held, *molecule* typed, the reading made chemical
(3 atoms · 2 bonds · bent), a model asked for structures (water 0.81, ozone 0.64, held), water taken, and the ink drawn
as a 2D structure — O and H by element, lone pairs, the 104.5° bond angle — with the hand's ink beneath; the next one
drawn is known and drawn as water too, no model asked; 03 diagram (Mermaid, tidy), 04 run, 05 kinds (colour follows meaning),
06 arrange (orbit), 07 together (Claude's hand; the desk and the pad). Beats 04–07 are **v1 as specced** (V1-SPEC §5–§6),
not yet built — a teaser's promise, drawn as the spec says it will look.

**Act IV** (161–170 s): *dyna.ink* written by hand, then drawn clean in front; *the diagrammatic notebook that runs*; the address.

## Use

```bash
open launch-video/index.html                    # scrub it: the bar under the stage, space to play
node launch-video/render.mjs                    # → launch-video/out/dynaink-soft-launch.mp4, with sound (about 6 min)
node launch-video/render.mjs --silent           # the picture alone
node launch-video/sound.mjs                     # out/cues.json → out/sound.wav (render.mjs writes the cues)
node launch-video/check.mjs                     # the layout check: text clipped, spilling out of its box, covered, overlapping
node launch-video/render.mjs --stills 3,35,77   # → out/still-<t>.png
node launch-video/render.mjs --from 40 --to 50 --out clip.mp4
node launch-video/render.mjs --url dyna.ink     # the end card's address (default: the live app's)
```

Every frame is `render(t)`, a pure function of time, so a render is deterministic. It needs Playwright
(the e2e's or a global install) and ffmpeg.

## Sound

Synthesised, not sampled, and quiet on purpose — emphasis, not a soundtrack. The page keeps a cue list,
`window.CUES` (`{ t, kind, dur?, note?, gain? }`), timed from the same beats and v1 moments the picture uses (`unwarp`
maps a demo moment to film time), so re-timing the film re-times the sound. `sound.mjs` turns it into a 48 kHz stereo
WAV with no dependencies and a seeded noise source, so the same cues make the same bytes: a pen's paper grain
(band-passed noise whose speed wavers), keys, a fingertip's tap, a plucked string when a clean form arrives, a soft bell
when something is read (D major pentatonic, so every chime agrees with every other), a rising blip when something
appears, a whoosh when the camera cuts, a scratch-out and its low thump, two notes stepping down for *not sure*, and an
open D chord for the name — over a bed of an open fifth that breathes slowly, through a small reverb, peaking at −3 dBFS
(about −21 LUFS). `render.mjs` synthesises the stretch it rendered and muxes it in as AAC.

**Honest notes.** The shape rung has eight entries and no pentagon: today a regular pentagon reads rectangle 0.44 ·
circle 0.43, held open. The film shows what a measured classifier above the rung would say — the corners, sides and
angles are computed from the drawn figure. The structure search for *molecule* is a model's proposal in the film;
nothing in the engine knows chemistry.
